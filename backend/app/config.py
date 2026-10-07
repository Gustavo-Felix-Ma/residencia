import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://efgnxifjracorggyeiot.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "sb_publishable_AZiIksKGUET7Gq4mVwObYg_mji6CIBr")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
PUBLIC_VERIFY_BASE_URL = os.getenv("PUBLIC_VERIFY_BASE_URL", "http://localhost:5173/verificar")
