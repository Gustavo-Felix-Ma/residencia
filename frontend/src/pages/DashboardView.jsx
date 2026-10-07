import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { FileText, Clock, CheckCircle, ShieldCheck } from 'lucide-react';

export default function DashboardView() {
  const { currentProfile } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docRes, histRes] = await Promise.all([
        supabase.from('documents').select('*').order('created_at', { ascending: false }),
        supabase.from('history').select('*').order('date', { ascending: false }).limit(5)
      ]);

      if (docRes.data) setDocuments(docRes.data);
      if (histRes.data) setHistory(histRes.data);
    } catch (err) {
      console.error('Error al cargar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalDocs = documents.length;
  const pendingDocs = documents.filter(d => d.status === 'pending').length;
  const signedDocs = documents.filter(d => d.status === 'signed').length;
  const verifiedCount = history.filter(h => h.type === 'verify').length;

  return (
    <div className="content-section active">
      <div className="section-header mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bienvenido, {currentProfile?.full_name?.split(' ')[0]}</h2>
          <p className="text-sm text-gray-500">Resumen general del sistema de firma digital post-cuántica</p>
        </div>
      </div>

      <div className="cards-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="stat-icon w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <div className="stat-value text-3xl font-bold text-gray-900 dark:text-white">{totalDocs}</div>
          <div className="stat-label text-xs text-gray-500">Documentos totales</div>
        </div>

        <div className="stat-card p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="stat-icon w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <div className="stat-value text-3xl font-bold text-gray-900 dark:text-white">{pendingDocs}</div>
          <div className="stat-label text-xs text-gray-500">Pendientes de firma</div>
        </div>

        <div className="stat-card p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="stat-icon w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="stat-value text-3xl font-bold text-gray-900 dark:text-white">{signedDocs}</div>
          <div className="stat-label text-xs text-gray-500">Firmados con ML-DSA-87</div>
        </div>

        <div className="stat-card p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="stat-icon w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="stat-value text-3xl font-bold text-gray-900 dark:text-white">{verifiedCount}</div>
          <div className="stat-label text-xs text-gray-500">Validaciones realizadas</div>
        </div>
      </div>

      <div className="table-container bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="table-header p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-sm">Actividad Reciente</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3">Documento</th>
                <th className="px-6 py-3">Cargado por</th>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {documents.slice(0, 5).map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-medium max-w-xs truncate">{doc.name}</td>
                  <td className="px-6 py-4">{doc.uploaded_by_name}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">{new Date(doc.created_at).toLocaleDateString('es-ES')}</td>
                  <td className="px-6 py-4">
                    <span className={`status-badge ${doc.status === 'signed' ? 'status-signed' : 'status-pending'}`}>
                      {doc.status === 'signed' ? '✅ Firmado ML-DSA' : '⏳ Pendiente'}
                    </span>
                  </td>
                </tr>
              ))}

              {documents.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-500 text-sm">No hay documentos registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
