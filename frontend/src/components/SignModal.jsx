import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { signDocument } from '../lib/api';
import { supabase } from '../lib/supabase';
import { FileText, CheckCircle2, Lock, Download, Loader2 } from 'lucide-react';

export default function SignModal({ document: doc, isOpen, onClose, onSuccess }) {
  const { currentProfile } = useAuth();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  if (!isOpen || !doc) return null;

  const handleSign = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!pin) {
      setError('Por favor ingrese su PIN de seguridad.');
      return;
    }

    setLoading(true);
    try {
      const res = await signDocument(doc.id, currentProfile.id, pin);
      setResult(res);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Error al firmar el documento.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result?.signed_storage_path) return;
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(result.signed_storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.name.replace('.pdf', '')}_firmado_oficial.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al descargar PDF firmado: ' + err.message);
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            <h3 className="font-bold text-lg">Firma Digital Híbrida (RSA-2048 + ML-DSA-87)</h3>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="alert alert-info mb-4" style={{ display: 'flex' }}>
            <span>📄 Documento seleccionado: <b>{doc.name}</b> ({ (doc.size / 1024).toFixed(1) } KB)</span>
          </div>

          {error && (
            <div className="alert alert-error mb-4" style={{ display: 'flex' }}>
              <span>⚠️ {error}</span>
            </div>
          )}

          {!result ? (
            <form onSubmit={handleSign}>
              <div className="form-group mb-4">
                <label className="block text-sm font-semibold mb-1">Ingrese su PIN de Seguridad para Desbloquear Llave Privada</label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="PIN de 6 dígitos"
                    required
                    disabled={loading}
                    autoFocus
                  />
                  <span className="input-icon">🔒</span>
                </div>
              </div>

              <div className="modal-footer mt-6">
                <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success gap-2" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>{loading ? 'Descifrando y Aplicando ML-DSA-87...' : 'Firmar Documento'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="sign-result mt-4">
              <div className="flex items-center gap-2 mb-3 text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
                <h4 className="font-bold text-base">¡Documento Firmado y Certificado con Éxito!</h4>
              </div>
              <p className="text-xs mb-2"><strong>Hash SHA-256 Binario Real:</strong></p>
              <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs break-all font-mono text-primary mb-3">
                {result.doc_hash}
              </code>
              <p className="text-xs mb-2"><strong>Firma Clásica RSA-2048 (RSASSA-PSS):</strong></p>
              <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs break-all font-mono text-primary mb-3">
                {result.rsa_signature.substring(0, 80)}...
              </code>
              <p className="text-xs mb-2"><strong>Firma Post-Cuántica ML-DSA-87 (FIPS 204):</strong></p>
              <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs break-all font-mono text-purple mb-4">
                {result.mldsa_signature.substring(0, 120)}... [4,627 Bytes]
              </code>

              <div className="modal-footer mt-6">
                <button className="btn btn-outline" onClick={onClose}>
                  Cerrar
                </button>
                <button className="btn btn-success gap-2" onClick={handleDownload}>
                  <Download className="w-4 h-4" />
                  <span>Descargar PDF Oficial Firmado con QR</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
