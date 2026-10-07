import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { generateUserKeys } from '../lib/api';
import { KeyRound, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';

export default function KeyModal({ isOpen, onClose }) {
  const { currentProfile, refreshKeyStatus } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!pin || pin.length < 6) {
      setError('El PIN debe tener al menos 6 caracteres.');
      return;
    }

    if (pin !== confirmPin) {
      setError('Los PINs ingresados no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await generateUserKeys(currentProfile.id, pin);
      await refreshKeyStatus(currentProfile.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al generar llaves criptográficas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <h3 className="font-bold text-lg">Generación de Llaves Criptográficas</h3>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="alert alert-warning mb-4" style={{ display: 'flex' }}>
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
            <span>
              Se generará su par de llaves <b>RSA-2048</b> y <b>ML-DSA-87 (FIPS 204)</b>. 
              La clave privada será cifrada con su PIN de seguridad usando AES-256-GCM.
            </span>
          </div>

          {error && (
            <div className="alert alert-error mb-4" style={{ display: 'flex' }}>
              <span>⚠️ {error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group mb-4">
              <label className="block text-sm font-semibold mb-1">Definir PIN de Seguridad (mín. 6 caracteres)</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Ingrese su PIN de 6+ dígitos"
                  required
                  disabled={loading}
                />
                <span className="input-icon">🔒</span>
              </div>
            </div>

            <div className="form-group mb-4">
              <label className="block text-sm font-semibold mb-1">Confirmar PIN</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Confirme su PIN"
                  required
                  disabled={loading}
                />
                <span className="input-icon">🔑</span>
              </div>
            </div>

            <div className="modal-footer mt-6">
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-accent gap-2" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>{loading ? 'Generando Llaves (ML-DSA-87)...' : 'Generar y Cifrar Llaves'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
