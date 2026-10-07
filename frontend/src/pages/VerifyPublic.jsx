import React, { useState, useEffect } from 'react';
import { verifyByFolio, verifyByFile } from '../lib/api';
import { Shield, Search, UploadCloud, CheckCircle2, XCircle, ArrowLeft, Loader2 } from 'lucide-react';

export default function VerifyPublic() {
  const [folio, setFolio] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const folioParam = params.get('folio');
    if (folioParam) {
      setFolio(folioParam);
      executeFolioVerification(folioParam);
    }
  }, []);

  const executeFolioVerification = async (folioId) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await verifyByFolio(folioId);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Error al verificar por folio.');
    } finally {
      setLoading(false);
    }
  };

  const handleFolioSubmit = (e) => {
    e.preventDefault();
    if (!folio.trim()) return;
    executeFolioVerification(folio.trim());
  };

  const handleFileDrop = async (files) => {
    if (!files || files.length === 0) return;
    const selectedFile = files[0];
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Por favor seleccione únicamente un archivo en formato PDF.');
      return;
    }

    setFile(selectedFile);
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await verifyByFile(selectedFile);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Error al verificar archivo PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-between">
      <header className="bg-primary-dark border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold">Portal Público de Verificación Documental</h1>
            <p className="text-xs text-blue-300">Tecnológico de Estudios Superiores de Jocotitlán (TESJo)</p>
          </div>
        </div>

        <a href="/" className="btn btn-outline btn-sm text-xs text-gray-300 border-gray-700 hover:bg-gray-800 gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Acceso al Sistema</span>
        </a>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col justify-center">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold mb-2">Comprobación de Integridad Criptográfica</h2>
          <p className="text-sm text-gray-400 max-w-xl mx-auto">
            Verifique la autenticidad e inmutabilidad de un documento académico o administrativo firmado con <b>RSA-2048</b> y <b>ML-DSA-87 (FIPS 204)</b>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Opción 1: Consulta por Folio */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base mb-2 flex items-center gap-2 text-accent">
                <Search className="w-5 h-5" />
                <span>Opción 1: Por Folio Único (QR)</span>
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Ingrese el código de folio impreso en el certificado o escanee el código QR.
              </p>
              <form onSubmit={handleFolioSubmit}>
                <div className="input-wrapper mb-4">
                  <input
                    type="text"
                    value={folio}
                    onChange={(e) => setFolio(e.target.value)}
                    placeholder="Ejemplo: 4f8a9e2c-..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-accent outline-none font-mono"
                  />
                </div>
                <button type="submit" className="btn btn-accent w-full justify-center gap-2" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Consultar Folio</span>
                </button>
              </form>
            </div>
          </div>

          {/* Opción 2: Consulta por Archivo PDF */}
          <div
            className="bg-gray-800/60 border-2 border-dashed border-gray-700 hover:border-accent rounded-2xl p-6 text-center flex flex-col items-center justify-center cursor-pointer transition-all"
            onClick={() => document.getElementById('publicFileInput').click()}
          >
            <UploadCloud className="w-10 h-10 text-accent mb-2" />
            <h3 className="font-bold text-base mb-1">Opción 2: Arrastre el PDF Original</h3>
            <p className="text-xs text-gray-400 mb-4">
              Calcula el hash SHA-256 en tiempo real y verifica contra la base de datos inmutable.
            </p>
            <input
              type="file"
              id="publicFileInput"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => handleFileDrop(e.target.files)}
            />
            <button type="button" className="btn btn-outline border-gray-600 text-gray-200 text-xs gap-2">
              <span>Seleccionar PDF</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300 text-sm mb-6 flex items-center gap-3">
            <XCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Resultado de la Verificación */}
        {result && (
          <div className={`p-6 rounded-2xl border ${
            result.is_valid
              ? 'bg-emerald-950/40 border-emerald-600 text-emerald-100'
              : 'bg-red-950/40 border-red-600 text-red-100'
          }`}>
            <div className="flex items-start gap-4 mb-4">
              {result.is_valid ? <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" /> : <XCircle className="w-8 h-8 text-red-400 shrink-0" />}
              <div>
                <h3 className="text-xl font-bold">{result.is_valid ? '✅ DOCUMENTO AUTÉNTICO Y VÁLIDO' : '❌ FIRMA NO VÁLIDA O DOCUMENTO ALTERADO'}</h3>
                <p className="text-xs mt-1 text-gray-300">{result.message}</p>
              </div>
            </div>

            {result.document_name && (
              <div className="bg-gray-900/80 p-4 rounded-xl space-y-2 text-xs mb-4">
                <div><span className="text-gray-400 font-semibold">Documento:</span> {result.document_name}</div>
                {result.signed_by && <div><span className="text-gray-400 font-semibold">Firmado Por:</span> {result.signed_by} ({result.signer_role || 'Firmante Oficial'})</div>}
                {result.signed_at && <div><span className="text-gray-400 font-semibold">Fecha de Firma:</span> {new Date(result.signed_at).toLocaleString('es-ES')}</div>}
                {result.doc_hash && (
                  <div>
                    <span className="text-gray-400 font-semibold block mb-1">Hash SHA-256 Binario:</span>
                    <code className="block bg-black/50 p-2 rounded text-emerald-400 font-mono text-[11px] break-all">
                      {result.doc_hash}
                    </code>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
              <div className="p-3 bg-black/40 rounded-lg flex items-center justify-between">
                <span>Firma Clásica RSA-2048:</span>
                <span className={result.rsa_valid ? 'text-emerald-400' : 'text-red-400'}>
                  {result.rsa_valid ? '✅ Válida (RSASSA-PSS)' : '❌ Inválida'}
                </span>
              </div>

              <div className="p-3 bg-black/40 rounded-lg flex items-center justify-between">
                <span>Post-Cuántica ML-DSA-87:</span>
                <span className={result.mldsa_valid ? 'text-purple-400' : 'text-red-400'}>
                  {result.mldsa_valid ? '✅ Válida (FIPS 204)' : '❌ Inválida'}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-4 text-xs text-gray-500 border-t border-gray-800">
        Tecnológico de Estudios Superiores de Jocotitlán · División de Ingeniería en Sistemas Computacionales
      </footer>
    </div>
  );
}
