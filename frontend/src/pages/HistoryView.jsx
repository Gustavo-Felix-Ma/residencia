import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { History, Shield, Lock, Search, FileText, Trash2 } from 'lucide-react';

export default function HistoryView() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data } = await supabase.from('history').select('*').order('date', { ascending: false }).limit(50);
      setHistory(data || []);
    } catch (err) {
      console.error('Error al cargar historial:', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'sign': return <Lock className="w-4 h-4 text-emerald-500" />;
      case 'verify': return <Search className="w-4 h-4 text-accent" />;
      case 'upload': return <FileText className="w-4 h-4 text-blue-500" />;
      default: return <Shield className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="content-section active">
      <div className="section-header mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Historial de Auditoría e Inmutabilidad</h2>
          <p className="text-sm text-gray-500">Registro cronológico de operaciones criptográficas y eventos del sistema</p>
        </div>
      </div>

      <div className="space-y-4">
        {history.map((item) => (
          <div key={item.id} className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 shrink-0">
              {getIcon(item.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">{item.title}</h4>
                <span className="text-xs text-gray-400">{new Date(item.date).toLocaleString('es-ES')}</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-2">{item.description}</p>
              <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                👤 {item.user_name}
              </span>
            </div>
          </div>
        ))}

        {history.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">No hay eventos registrados en el historial</div>
        )}
      </div>
    </div>
  );
}
