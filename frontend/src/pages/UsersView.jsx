import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserPlus, Shield, CheckCircle2, XCircle } from 'lucide-react';

const ROLE_LABELS = {
  jefe_division: 'Jefe de División',
  presidente_academia: 'Presidente de Academia',
  secretario_academia: 'Secretario de Academia',
  docente: 'Docente'
};

export default function UsersView() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setUsers(data || []);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  return (
    <div className="content-section active">
      <div className="section-header mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Administración de Usuarios y Roles</h2>
          <p className="text-sm text-gray-500">Gestión de la estructura directiva y académica del TESJo</p>
        </div>
      </div>

      <div className="table-container bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="table-header p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-sm">Usuarios Registrados</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3">Usuario / ID</th>
                <th className="px-6 py-3">Nombre Completo</th>
                <th className="px-6 py-3">Rol Institucional</th>
                <th className="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-mono text-xs">{u.username}</td>
                  <td className="px-6 py-4 font-semibold">{u.full_name}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`status-badge ${u.active ? 'status-signed' : 'status-pending'}`}>
                      {u.active ? '✅ Activo' : '⛔ Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
