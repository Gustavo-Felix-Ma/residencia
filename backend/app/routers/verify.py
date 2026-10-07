from fastapi import APIRouter, File, UploadFile, HTTPException
from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_ANON_KEY
from app.schemas.schemas import VerifyResponse
from app.crypto.rsa_engine import verify_rsa_sha256
from app.crypto.mldsa_engine import verify_mldsa87
from app.pdf.hasher import compute_pdf_sha256

router = APIRouter(prefix="/api/verify", tags=["Verificación de Firmas"])

def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

@router.get("/folio/{document_id}", response_model=VerifyResponse)
async def verify_by_folio(document_id: str):
    """
    Verifica la autenticidad e integridad de un documento mediante su Folio Único (ID).
    Ejecuta la validación matemática de las firmas RSA-2048 y ML-DSA-87.
    """
    supabase = get_supabase()
    res = supabase.table("documents").select("*").eq("id", document_id).execute()
    
    if not res.data or len(res.data) == 0:
        return VerifyResponse(
            is_valid=False,
            hash_matches=False,
            rsa_valid=False,
            mldsa_valid=False,
            message="El folio consultado no existe en el registro del sistema."
        )
        
    doc = res.data[0]
    if doc.get("status") != "signed":
        return VerifyResponse(
            is_valid=False,
            document_name=doc.get("name"),
            hash_matches=False,
            rsa_valid=False,
            mldsa_valid=False,
            message="El documento registrado existe pero aún no ha sido firmado."
        )
        
    doc_hash = doc.get("doc_hash")
    rsa_sig = doc.get("rsa_signature")
    mldsa_sig = doc.get("mldsa_signature")
    rsa_pub = doc.get("rsa_public_pem")
    mldsa_pub = doc.get("mldsa_public_hex")
    
    if not doc_hash or not rsa_sig or not mldsa_sig or not rsa_pub or not mldsa_pub:
        return VerifyResponse(
            is_valid=False,
            document_name=doc.get("name"),
            hash_matches=False,
            rsa_valid=False,
            mldsa_valid=False,
            message="Datos de firma incompletos o corruptos."
        )
        
    hash_bytes = bytes.fromhex(doc_hash)
    
    rsa_valid = verify_rsa_sha256(rsa_pub, hash_bytes, rsa_sig)
    mldsa_valid = verify_mldsa87(mldsa_pub, hash_bytes, mldsa_sig)
    
    is_valid = rsa_valid and mldsa_valid
    
    # Buscar rol del firmante
    role_name = "Docente"
    if doc.get("signed_by_user_id"):
        prof_res = supabase.table("profiles").select("role").eq("id", doc["signed_by_user_id"]).execute()
        if prof_res.data:
            roles = {
                "jefe_division": "Jefe de División",
                "presidente_academia": "Presidente de Academia",
                "secretario_academia": "Secretario de Academia",
                "docente": "Docente"
            }
            role_name = roles.get(prof_res.data[0]["role"], prof_res.data[0]["role"])
            
    # Registrar evento de verificacion en auditoria
    try:
        supabase.table("history").insert({
            "type": "verify",
            "title": f"Verificación por Folio: {'Exitosa' if is_valid else 'Fallida'}",
            "description": f"Verificación de '{doc['name']}' (ID: {document_id}). RSA: {rsa_valid}, ML-DSA: {mldsa_valid}.",
            "user_name": "Consulta Pública"
        }).execute()
    except Exception:
        pass
        
    return VerifyResponse(
        is_valid=is_valid,
        document_name=doc.get("name"),
        signed_by=doc.get("signed_by"),
        signer_role=role_name,
        signed_at=doc.get("signed_at"),
        hash_matches=True,
        rsa_valid=rsa_valid,
        mldsa_valid=mldsa_valid,
        doc_hash=doc_hash,
        rsa_signature=rsa_sig,
        mldsa_signature=mldsa_sig,
        message="Verificación exitosa: Las firmas RSA-2048 y ML-DSA-87 son válidas y coinciden con el registro." if is_valid else "Firma inválida o adulterada."
    )

@router.post("/file", response_model=VerifyResponse)
async def verify_by_file(file: UploadFile = File(...)):
    """
    Verifica un archivo PDF cargado directamente por un usuario en el portal público.
    Calcula el hash SHA-256 del binario y busca coincidencias registradas.
    """
    pdf_bytes = await file.read()
    file_hash = compute_pdf_sha256(pdf_bytes)
    
    supabase = get_supabase()
    res = supabase.table("documents").select("*").eq("doc_hash", file_hash).execute()
    
    if not res.data or len(res.data) == 0:
        return VerifyResponse(
            is_valid=False,
            document_name=file.filename,
            hash_matches=False,
            rsa_valid=False,
            mldsa_valid=False,
            message="El archivo cargado no coincide con ningún hash registrado en el sistema. El documento pudo haber sido modificado o no ha sido firmado."
        )
        
    doc = res.data[0]
    hash_bytes = bytes.fromhex(file_hash)
    
    rsa_valid = verify_rsa_sha256(doc["rsa_public_pem"], hash_bytes, doc["rsa_signature"])
    mldsa_valid = verify_mldsa87(doc["mldsa_public_hex"], hash_bytes, doc["mldsa_signature"])
    
    is_valid = rsa_valid and mldsa_valid
    
    return VerifyResponse(
        is_valid=is_valid,
        document_name=doc.get("name"),
        signed_by=doc.get("signed_by"),
        signed_at=doc.get("signed_at"),
        hash_matches=True,
        rsa_valid=rsa_valid,
        mldsa_valid=mldsa_valid,
        doc_hash=file_hash,
        rsa_signature=doc.get("rsa_signature"),
        mldsa_signature=doc.get("mldsa_signature"),
        message="✅ Documento Auténtico. Hash verificado y firmas RSA-2048 y ML-DSA-87 matemáticas aprobadas." if is_valid else "❌ Firma inváĺida."
    )
