import datetime
from fastapi import APIRouter, HTTPException, status
from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_ANON_KEY, PUBLIC_VERIFY_BASE_URL
from app.schemas.schemas import SignDocumentRequest, SignDocumentResponse
from app.crypto.key_vault import decrypt_private_keys
from app.crypto.rsa_engine import sign_rsa_sha256
from app.crypto.mldsa_engine import sign_mldsa87
from app.pdf.hasher import compute_pdf_sha256
from app.pdf.stamper import generate_signature_sheet_pdf, attach_signature_sheet_to_pdf

router = APIRouter(prefix="/api/sign", tags=["Firma Digital"])

def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

@router.post("/document", response_model=SignDocumentResponse)
async def sign_document(req: SignDocumentRequest):
    """
    Ejecuta el proceso completo de firma digital híbrida (RSA-2048 + ML-DSA-87) sobre un documento PDF.
    1. Descifra la clave privada del usuario con su PIN.
    2. Descarga el archivo PDF original de Supabase Storage.
    3. Calcula el hash SHA-256 binario real del PDF.
    4. Genera firmas RSA-2048 y ML-DSA-87.
    5. Estampa la Hoja de Firmas Oficial con Código QR al final del PDF.
    6. Guarda el PDF firmado resultante y actualiza los registros.
    """
    supabase = get_supabase()
    
    # 1. Buscar documento en la base de datos
    doc_res = supabase.table("documents").select("*").eq("id", req.document_id).execute()
    if not doc_res.data or len(doc_res.data) == 0:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    doc_data = doc_res.data[0]
    
    if doc_data.get("status") == "signed":
        raise HTTPException(status_code=400, detail="El documento ya ha sido firmado previamente.")
        
    # 2. Buscar llaves del usuario
    key_res = supabase.table("user_keys").select("*").eq("user_id", req.user_id).execute()
    if not key_res.data or len(key_res.data) == 0:
        raise HTTPException(status_code=400, detail="El usuario no ha generado sus llaves criptográficas. Por favor generelas en su perfil primero.")
    key_row = key_res.data[0]
    
    # 3. Buscar nombre y rol del usuario
    profile_res = supabase.table("profiles").select("full_name, role").eq("id", req.user_id).execute()
    signer_name = profile_res.data[0]["full_name"] if profile_res.data else "Usuario Autorizado"
    signer_role_raw = profile_res.data[0]["role"] if profile_res.data else "docente"
    
    role_labels = {
        "jefe_division": "Jefe de División",
        "presidente_academia": "Presidente de Academia",
        "secretario_academia": "Secretario de Academia",
        "docente": "Docente"
    }
    signer_role = role_labels.get(signer_role_raw, signer_role_raw)
    
    # 4. Descifrar llaves privadas con el PIN
    try:
        rsa_priv_pem, mldsa_priv_hex = decrypt_private_keys(
            pin=req.pin,
            encrypted_rsa_hex=key_row["encrypted_rsa_private"],
            salt_hex=key_row["salt_hex"],
            nonce_hex=key_row["nonce_hex"],
            tag_hex=key_row["tag_hex"]
        )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
        
    # 5. Descargar archivo binario PDF desde Supabase Storage
    try:
        pdf_bytes = supabase.storage.from_("documents").download(doc_data["original_storage_path"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo descargar el archivo PDF de Storage: {str(e)}")
        
    # 6. Calcular Hash SHA-256 binario real
    doc_hash = compute_pdf_sha256(pdf_bytes)
    hash_bytes = bytes.fromhex(doc_hash)
    
    # 7. Firmar el hash binario con RSA-2048 y ML-DSA-87
    rsa_sig_hex = sign_rsa_sha256(rsa_priv_pem, hash_bytes)
    mldsa_sig_hex = sign_mldsa87(mldsa_priv_hex, hash_bytes)
    
    # 8. Generar Hoja de Firmas Oficial con QR
    signed_at_now = datetime.datetime.now(datetime.timezone.utc)
    signed_at_str = signed_at_now.strftime("%d/%m/%Y %H:%M:%S UTC")
    
    verify_url = f"{PUBLIC_VERIFY_BASE_URL}?folio={doc_data['id']}"
    
    sheet_bytes = generate_signature_sheet_pdf(
        doc_name=doc_data["name"],
        doc_hash=doc_hash,
        signed_by=signer_name,
        signer_role=signer_role,
        signed_at_str=signed_at_str,
        rsa_sig_hex=rsa_sig_hex,
        mldsa_sig_hex=mldsa_sig_hex,
        verify_url=verify_url
    )
    
    # 9. Anexar la hoja de firma al PDF
    signed_pdf_bytes = attach_signature_sheet_to_pdf(pdf_bytes, sheet_bytes)
    
    # 10. Subir PDF firmado a Supabase Storage
    signed_storage_path = f"signed/{req.user_id}/{Date_now_ts()}_{doc_data['name']}"
    try:
        supabase.storage.from_("documents").upload(
            signed_storage_path,
            signed_pdf_bytes,
            file_options={"content-type": "application/pdf"}
        )
    except Exception as e:
        # En caso de error al subir PDF firmado
        raise HTTPException(status_code=500, detail=f"Error al subir el PDF firmado a Storage: {str(e)}")
        
    # 11. Actualizar registro en la tabla documents
    db_update = {
        "status": "signed",
        "signed_by": signer_name,
        "signed_by_user_id": req.user_id,
        "signed_storage_path": signed_storage_path,
        "doc_hash": doc_hash,
        "rsa_signature": rsa_sig_hex,
        "mldsa_signature": mldsa_sig_hex,
        "rsa_public_pem": key_row["rsa_public_pem"],
        "mldsa_public_hex": key_row["mldsa_public_hex"],
        "signed_at": signed_at_now.isoformat()
    }
    
    supabase.table("documents").update(db_update).eq("id", req.document_id).execute()
    
    # 12. Registrar en historial / audit_log
    history_entry = {
        "type": "sign",
        "title": "Documento Firmado Criptográficamente",
        "description": f"Se aplicó firma híbrida RSA-2048 y ML-DSA-87 al archivo '{doc_data['name']}'.",
        "user_name": signer_name,
        "user_id": req.user_id
    }
    supabase.table("history").insert(history_entry).execute()
    
    return SignDocumentResponse(
        success=True,
        message="Documento firmado e inmutablemente registrado con éxito.",
        doc_hash=doc_hash,
        rsa_signature=rsa_sig_hex,
        mldsa_signature=mldsa_sig_hex,
        signed_storage_path=signed_storage_path
    )

def Date_now_ts():
    return int(datetime.datetime.now().timestamp() * 1000)
