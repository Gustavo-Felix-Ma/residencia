import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { UploadCloud, FileText, Trash2, PenTool, Loader2 } from 'lucide-react';

export default function DocumentsView({ onOpenSign }) {
  const { currentProfile } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      let query = supabase.from('documents').select('*').order('created_at', { ascending: false });
      if (currentProfile?.role === 'docente') {
        query = query.eq('uploaded_by', currentProfile.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error al cargar documentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files) => {
    setError('');
    setSuccess('');
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

    if (pdfs.length === 0) {
      setError('Solo se permiten archivos en formato PDF.');
      return;
    }

    setUploading(true);
    let addedCount = 0;

    try {
      for (const file of pdfs) {
        if (file.size > 10 * 1024 * 1024) {
          setError(`El archivo ${file.name} supera el límite de 10 MB.`);
          continue;
        }

        const filePath = `original/${currentProfile.id}/${Date.now()}_${file.name}`;
        const { error: storageErr } = await supabase.storage.from('documents').upload(filePath, file);

        if (storageErr) {
          setError(`Error al subir ${file.name}: ${storageErr.message}`);
          continue;
        }

        const { error: dbErr } = await supabase.from('documents').insert({
          name: file.name,
          size: file.size,
          original_storage_path: filePath,
          status: 'pending',
          uploaded_by: currentProfile.id,
          uploaded_by_name: currentProfile.full_name
        });

        if (dbErr) {
          await supabase.storage.from('documents').remove([filePath]);
          setError(`Error al registrar ${file.name} en la BD: ${dbErr.message}`);
          continue;
        }

        addedCount++;
      }

      if (addedCount > 0) {
        setSuccess(`${addedCount} archivo(s) PDF cargado(s) exitosamente.`);
        loadDocuments();
      }
    } catch (err) {
      setError(err.message || 'Error durante la carga.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`¿Desea eliminar el documento "${doc.name}"?`)) return;
    try {
      if (doc.original_storage_path) await supabase.storage.from('documents').remove([doc.original_storage_path]);
      if (doc.signed_storage_path) await supabase.storage.from('documents').remove([doc.signed_storage_path]);
      await supabase.from('documents').delete().eq('id', doc.id);
      loadDocuments();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  return (
    <div className="content-section active">
      <div className="section-header mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Documentos</h2>
          <p className="text-sm text-gray-500">Carga archivos PDF para firma criptográfica híbrida</p>
        </div>
      </div>

      <div
        className="upload-zone border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center bg-gray-50 dark:bg-gray-800/50 hover:border-accent transition-all cursor-pointer mb-6"
        onClick={() => document.getElementById('fileInput').click()}
      >
        <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Arrastra tus archivos PDF aquí</h3>
        <p className="text-xs text-gray-500 mb-4">o haz clic para seleccionar desde tu equipo (máx. 10MB por archivo)</p>
        <input
          type="file"
          id="fileInput"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
        <button type="button" className="btn btn-accent gap-2" disabled={uploading}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          <span>{uploading ? 'Subiendo PDF...' : 'Seleccionar Archivos'}</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4" style={{ display: 'flex' }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-4" style={{ display: 'flex' }}>
          <span>✅ {success}</span>
        </div>
      )}

      <div className="table-container bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="table-header p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-semibold text-sm">Documentos Cargados</h3>
          <span className="text-xs text-gray-500 font-mono">{documents.length} archivo(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">Tamaño</th>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-medium truncate max-w-xs" title={doc.name}>📄 {doc.name}</td>
                  <td className="px-6 py-4 text-xs text-gray-500 font-mono">{(doc.size / 1024).toFixed(1)} KB</td>
                  <td className="px-6 py-4 text-xs text-gray-500">{new Date(doc.created_at).toLocaleDateString('es-ES')}</td>
                  <td className="px-6 py-4">
                    <span className={`status-badge ${doc.status === 'signed' ? 'status-signed' : 'status-pending'}`}>
                      {doc.status === 'signed' ? '✅ Firmado ML-DSA' : '⏳ Pendiente'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {doc.status === 'pending' && (
                        <button
                          onClick={() => onOpenSign(doc)}
                          className="btn btn-success btn-xs gap-1"
                        >
                          <PenTool className="w-3 h-3" />
                          <span>Firmar</span>
                        </button>
                      )}
                      {['jefe_division', 'presidente_academia'].includes(currentProfile?.role) && (
                        <button
                          onClick={() => handleDelete(doc)}
                          className="btn btn-danger btn-xs text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {documents.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500 text-sm">No hay documentos cargados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
