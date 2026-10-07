import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { verifyByFolio } from '../lib/api';
import { Search, CheckCircle2, XCircle, ShieldCheck, Download, Loader2 } from 'lucide-react';

export default function VerifyView() {
  const [signedDocs, setSignedDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSignedDocuments();
  }, []);

  const loadSignedDocuments = async () => {
    try {
      const { data } = await supabase.from('documents').select('*').eq('status', 'signed').order('signed_at', { ascending: false });
      setSignedDocs(data || []);
    } catch (err) {
      console.error('Error al cargar firmados:', err);
    }
  };

  const handleVerify = async (doc) => {
    setSelectedDoc(doc);
    setVerificationResult(null);
    setLoading(true);

    try {
      const res = await verifyByFolio(doc.id);
      setVerificationResult(res);
    } catch (err) {
      alert('Error en verificación: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc) => {
    if (!doc.signed_storage_path) return;
    try {
      const { data, error } = await supabase.storage.from('documents').download(doc.signed_storage_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.name.replace('.pdf', '')}_firmado_oficial.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al descargar: ' + err.message);
    }
  };

  return (
    <div className="content-section active">
      <div className="section-header mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Verificación de Firmas Criptográficas</h2>
          <p className="text-sm text-gray-500">Valida la autenticidad e integridad matemática de los documentos firmados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="table-container bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="table-header p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-sm">Documentos Firmados Registrados</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Firmado por</th>
                  <th className="px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {signedDocs.map((doc) => (
                  <tr key={doc.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${selectedDoc?.id === doc.id ? 'bg-accent/5' : ''}`}>
                    <td className="px-4 py-3 font-medium truncate max-w-[160px]" title={doc.name}>📄 {doc.name}</td>
                    <td className="px-4 py-3 text-xs">{doc.signed_by}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerify(doc)}
                          className="btn btn-accent btn-xs gap-1"
                        >
                          <Search className="w-3 h-3" />
                          <span>Verificar</span>
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="btn btn-outline btn-xs"
                          title="Descargar PDF Firmado con QR"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {signedDocs.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center py-8 text-gray-500 text-sm">No hay documentos firmados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <span>Resultado de Validación Matemática</span>
          </h3>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-accent mb-2" />
              <span className="text-sm">Verificando firmas RSA-2048 y ML-DSA-87...</span>
            </div>
          )}

          {!loading && verificationResult && (
            <div>
              <div className={`p-4 rounded-xl border mb-6 flex items-start gap-3 ${
                verificationResult.is_valid
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
              }`}>
                {verificationResult.is_valid ? <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" /> : <XCircle className="w-6 h-6 text-red-600 shrink-0" />}
                <div>
                  <h4 className="font-bold text-base">{verificationResult.is_valid ? '✅ VERIFICACIÓN EXITOSA' : '❌ FIRMA INVÁLIDA O ALTERADA'}</h4>
                  <p className="text-xs mt-1 leading-relaxed">{verificationResult.message}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block mb-1">Firma Clásica RSA-2048</span>
                  <div className="text-sm font-semibold">
                    {verificationResult.rsa_valid ? '✅ Válida (RSASSA-PSS)' : '❌ Inválida'}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 block mb-1">Post-Cuántica ML-DSA-87</span>
                  <div className="text-sm font-semibold">
                    {verificationResult.mldsa_valid ? '✅ Válida (FIPS 204)' : '❌ Inválida'}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-mono break-all">
                <span className="font-bold text-gray-500 block mb-1 font-sans">Hash SHA-256 Registrado:</span>
                <span className="text-primary dark:text-accent">{verificationResult.doc_hash}</span>
              </div>
            </div>
          )}

          {!loading && !verificationResult && (
            <div className="text-center py-12 text-gray-400 text-sm">
              Seleccione un documento de la lista y presione "Verificar" para validar sus firmas criptográficas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
