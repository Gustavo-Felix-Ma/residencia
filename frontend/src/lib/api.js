const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export async function checkKeysStatus(userId) {
  const res = await fetch(`${API_BASE_URL}/api/keys/status/${userId}`);
  if (!res.ok) throw new Error('Error al consultar estado de llaves');
  return await res.json();
}

export async function generateUserKeys(userId, pin) {
  const res = await fetch(`${API_BASE_URL}/api/keys/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, pin })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Error al generar llaves criptográficas');
  return data;
}

export async function signDocument(documentId, userId, pin) {
  const res = await fetch(`${API_BASE_URL}/api/sign/document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: documentId, user_id: userId, pin })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Error durante el proceso de firma');
  return data;
}

export async function verifyByFolio(documentId) {
  const res = await fetch(`${API_BASE_URL}/api/verify/folio/${documentId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Error al consultar folio');
  return data;
}

export async function verifyByFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/verify/file`, {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Error al verificar archivo');
  return data;
}
