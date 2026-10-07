from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import keys, sign, verify

app = FastAPI(
    title="FirmaDigital API - TESJo",
    description="API REST de Firma Digital Híbrida (RSA-2048 + ML-DSA-87 / FIPS 204)",
    version="1.0.0"
)

# Configuración CORS para permitir peticiones desde el frontend Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(keys.router)
app.include_router(sign.router)
app.include_router(verify.router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "system": "Plataforma de Firma Digital Híbrida (RSA + ML-DSA-87)",
        "institution": "Tecnológico de Estudios Superiores de Jocotitlán (TESJo)",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
