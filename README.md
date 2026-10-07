# Plataforma de Firma Digital Híbrida (RSA-2048 + ML-DSA-87)

**Proyecto de Titulación / Residencia Profesional**  
*Tecnológico de Estudios Superiores de Jocotitlán (TESJo)*  
*División de Ingeniería en Sistemas Computacionales*

Plataforma de Firma Electrónica con Criptografía Post-Cuántica (ML-DSA-87) y RSA para Documentos Académicos.


---

## 📌 Descripción del Proyecto

Esta plataforma web implementa un esquema de **firma digital híbrida** para garantizar la autenticidad, integridad y no-repudio de documentos académicos y administrativos en formato PDF:
1. **Firma Digital Clásica**: RSA-2048 con esquema RSASSA-PSS y hash SHA-256.
2. **Firma Digital Post-Cuántica**: **ML-DSA-87** (*Module-Lattice Digital Signature Algorithm*, estandarizado por el NIST en **FIPS 204**, Categoría 5 de seguridad equivalente a AES-256).

### Características Principales
- **Custodia de Claves Segura (Key Vault)**: Cada usuario genera su par de claves una única vez. Las claves privadas se almacenan cifradas en base de datos usando **AES-256-GCM** con clave derivada del PIN personal del docente mediante **PBKDF2HMAC (100,000 iteraciones SHA-256)**.
- **Hoja Institucional de Firmas con Código QR**: Al firmar un PDF, el sistema calcula el hash SHA-256 binario real del archivo, firma matemáticamente con RSA y ML-DSA-87, y estampa automáticamente una página oficial de certificación con el membrete del TESJo, los desgloses criptográficos y un código QR dinámico.
- **Portal de Verificación Pública Dual**: Accesible sin inicio de sesión (`/verificar`). Permite validar la autenticidad e inmutabilidad de cualquier documento consultando por Folio (QR) o arrastrando directamente el archivo PDF para validar las firmas matemáticas en tiempo real.
- **Control de Acceso Basado en Roles (RBAC)**: Soporta los roles del TESJo (`jefe_division`, `presidente_academia`, `secretario_academia`, `docente`).

---

## 🛠️ Arquitectura del Sistema

```
residencia/
├── backend/                  # API REST en Python (FastAPI)
│   ├── app/
│   │   ├── main.py           # Entrypoint y configuración CORS
│   │   ├── config.py         # Carga de variables de entorno
│   │   ├── crypto/
│   │   │   ├── rsa_engine.py # Firma y verificación RSA-2048 / PSS SHA-256
│   │   │   ├── mldsa_engine.py# Firma y verificación ML-DSA-87 (FIPS 204)
│   │   │   └── key_vault.py  # Cifrado/Descifrado AES-256-GCM con PIN
│   │   ├── pdf/
│   │   │   ├── hasher.py     # Cálculo de digest SHA-256 sobre binario real
│   │   │   └── stamper.py    # Estampador ReportLab + PyPDF de Hoja con QR
│   │   ├── routers/          # Endpoints de llaves, firma y verificación
│   │   └── schemas/          # Validadores Pydantic
│   ├── tests/                # Pruebas unitarias pytest
│   └── requirements.txt      # Librerías de Python
│
├── frontend/                 # Aplicación React 18 + Vite
│   ├── src/
│   │   ├── components/       # Header, Sidebar, KeyModal, SignModal
│   │   ├── context/          # AuthContext (Sesión, Rol y Tema)
│   │   ├── lib/              # Clientes Supabase y API Backend
│   │   └── pages/            # Login, Dashboard, Documentos, Firmar, Verificar, Historial, Usuarios, VerifyPublic
│   └── package.json
│
├── database/
│   └── schema.sql            # Script de tablas y políticas RLS para Supabase
│
└── venv/                     # Entorno virtual de Python (creado al instalar)
```

---

## ⚙️ Requisitos Previos

- **Python**: 3.11 o superior (`python --version`)
- **Node.js**: v18.0.0 o superior (`node -v`) y npm (`npm -v`)
- **Proyecto en Supabase**: Proyecto activo con URL y clave de API anon pública.

---

## 🚀 Guía de Instalación y Ejecución

### 1. Configuración de la Base de Datos (Supabase)

1. Ingrese al panel de su proyecto en **Supabase**.
2. Vaya a la sección **SQL Editor**.
3. Copie y ejecute el contenido del archivo [`database/schema.sql`](file:///c:/Users/-/OneDrive%20-%20Tecnologico%20de%20Estudios%20Superiores%20de%20Jocotitlan/Documentos/Semestres/residencia/database/schema.sql).
4. En la sección **Storage**, asegúrese de tener un Bucket público llamado `documents`.

---

### 2. Configuración y Ejecución del Backend (FastAPI)

#### A. Entorno Virtual de Python
El entorno virtual ya se encuentra creado en la carpeta `venv/`. Si requiere recrearlo:
```powershell
python -m venv venv
```

Activar el entorno virtual:
- En PowerShell / Windows:
  ```powershell
  .\venv\Scripts\activate
  ```

#### B. Instalación de Dependencias
```powershell
.\venv\Scripts\python.exe -m pip install -r backend/requirements.txt
```

#### C. Variables de Entorno (Opcional)
Crear un archivo `.env` dentro de la carpeta `backend/` si desea personalizar las URLs:
```env
SUPABASE_URL=https://efgnxifjracorggyeiot.supabase.co
SUPABASE_ANON_KEY=sb_publishable_AZiIksKGUET7Gq4mVwObYg_mji6CIBr
PUBLIC_VERIFY_BASE_URL=http://localhost:5173/verificar
```

#### D. Ejecutar Pruebas Unitarias Criptográficas
Para validar que RSA-2048, ML-DSA-87 y la Bóveda de Claves funcionen correctamente:
```powershell
.\venv\Scripts\pytest.exe -o pythonpath=backend backend/tests/test_crypto.py
```
*(Deberá mostrar `3 passed`)*.

#### E. Iniciar el Servidor Backend
```powershell
.\venv\Scripts\python.exe backend/run.py
```
El servidor FastAPI se iniciará en `http://localhost:8000`. Puede consultar la documentación interactiva OpenAPI en `http://localhost:8000/docs`.

---

### 3. Configuración y Ejecución del Frontend (React + Vite)

#### A. Instalación de Dependencias
Acceda a la carpeta `frontend/` e instale las dependencias de Node.js:
```powershell
cd frontend
npm install
```

#### B. Iniciar Servidor de Desarrollo
```powershell
npm run dev
```
La aplicación web estará disponible en `http://localhost:5173`.

#### C. Construir Paquete de Producción
```powershell
npm run build
```

---

## 🔐 Demostración y Flujo de Uso

1. **Iniciar Sesión**:
   - Acceda a `http://localhost:5173`.
   - Utilice la cuenta demo: `xaviortega27@gmail.com` / `12345678`.
2. **Generar Llaves Criptográficas**:
   - Si no ha generado sus llaves, aparecerá una alerta en la parte superior.
   - Haga clic en **"Generar Llaves Criptográficas"**, ingrese un PIN personal de 6 dígitos (ej. `123456`).
   - El sistema generará su par RSA y su par **ML-DSA-87 (FIPS 204)** y cifrará las privadas en Supabase.
3. **Cargar Documento PDF**:
   - Vaya a la sección **"Documentos"** y arrastre un archivo PDF (máximo 10 MB).
4. **Firmar Documento**:
   - Vaya a la sección **"Firmar"**, seleccione el documento y presione **"Firmar PDF"**.
   - Ingrese su PIN de seguridad de 6 dígitos.
   - Al finalizar, presione **"Descargar PDF Oficial Firmado con QR"**. El PDF incluirá la hoja de firmas oficial estampada al final.
5. **Verificación Pública**:
   - Abra un navegador o pestaña de incógnito e ingrese a `http://localhost:5173/verificar`.
   - Escanee el código QR del PDF firmado o ingrese el folio/arrastre el archivo PDF.
   - El sistema confirmará que el hash binario coincide y que las firmas RSA-2048 y ML-DSA-87 son válidas.

---

## 📊 Métricas Académicas para Tesis

| Parámetro Criptográfico | RSA-2048 (Clásica) | ML-DSA-87 (Post-Cuántica FIPS 204) |
|---|---|---|
| **Resistencia a Ordenadores Cuánticos** | ❌ Vulnerable (Algoritmo de Shor) | ✅ Resistente (Module Lattice) |
| **Tamaño de Clave Pública** | 294 bytes (PEM) | 2,592 bytes (5,184 hex digits) |
| **Tamaño de Clave Privada** | 1,192 bytes (PEM) | 4,896 bytes (9,792 hex digits) |
| **Tamaño de Firma Digital** | 256 bytes (512 hex digits) | 4,627 bytes (9,254 hex digits) |
| **Estándar NIST / ISO** | PKCS#1 v1.5 / PSS | NIST FIPS 204 (Categoría 5) |

