from fastapi import APIRouter, HTTPException, status
from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_ANON_KEY
from app.schemas.schemas import KeyGenerationRequest, KeyStatusResponse
from app.crypto.rsa_engine import generate_rsa_keypair
from app.crypto.mldsa_engine import generate_mldsa_keypair
from app.crypto.key_vault import encrypt_private_keys

router = APIRouter(prefix="/api/keys", tags=["Llaves Criptograficas"])

def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

@router.post("/generate", response_model=KeyStatusResponse)
async def generate_user_keys(req: KeyGenerationRequest):
    """
    Genera un nuevo par de llaves RSA-2048 y ML-DSA-87 para el usuario.
    Cifra las llaves privadas con AES-256-GCM derivado de su PIN personal.
    """
    supabase = get_supabase()
    
    # Verificar si el usuario ya tiene llaves
    existing = supabase.table("user_keys").select("user_id").eq("user_id", req.user_id).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario ya posee un par de llaves generadas. Para regenerar, contacte al administrador."
        )
        
    try:
        # 1. Generar pares de claves
        rsa_pub, rsa_priv = generate_rsa_keypair()
        mldsa_pub, mldsa_priv = generate_mldsa_keypair()
        
        # 2. Cifrar claves privadas con el PIN del usuario
        vault_data = encrypt_private_keys(req.pin, rsa_priv, mldsa_priv)
        
        # 3. Guardar en Supabase
        db_payload = {
            "user_id": req.user_id,
            "rsa_public_pem": rsa_pub,
            "mldsa_public_hex": mldsa_pub,
            "encrypted_rsa_private": vault_data["encrypted_rsa_private"],
            "encrypted_mldsa_private": vault_data["encrypted_mldsa_private"],
            "salt_hex": vault_data["salt_hex"],
            "nonce_hex": vault_data["nonce_hex"],
            "tag_hex": vault_data["tag_hex"]
        }
        
        res = supabase.table("user_keys").insert(db_payload).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Error al guardar las llaves en la base de datos.")
            
        return KeyStatusResponse(
            has_keys=True,
            rsa_public_pem=rsa_pub,
            mldsa_public_hex=mldsa_pub,
            created_at=res.data[0].get("created_at")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error durante la generación de llaves: {str(e)}")

@router.get("/status/{user_id}", response_model=KeyStatusResponse)
async def get_keys_status(user_id: str):
    """
    Consulta si el usuario tiene llaves asociadas y devuelve sus llaves públicas.
    """
    supabase = get_supabase()
    res = supabase.table("user_keys").select("rsa_public_pem, mldsa_public_hex, created_at").eq("user_id", user_id).execute()
    
    if not res.data or len(res.data) == 0:
        return KeyStatusResponse(has_keys=False)
        
    row = res.data[0]
    return KeyStatusResponse(
        has_keys=True,
        rsa_public_pem=row["rsa_public_pem"],
        mldsa_public_hex=row["mldsa_public_hex"],
        created_at=row["created_at"]
    )
