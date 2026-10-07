import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FileText, PenTool, Search, History, Users, ExternalLink } from 'lucide-react';

export default function Sidebar({ activeSection, setActiveSection }) {
  const { currentProfile } = useAuth();
  const role = currentProfile?.role;

  const navItems = [
    { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'firmar', label: 'Firmar', icon: PenTool },
    { id: 'verificar', label: 'Verificar', icon: Search },
    { id: 'historial', label: 'Historial', icon: History },
  ];

  if (['jefe_division', 'presidente_academia', 'secretario_academia'].includes(role)) {
    navItems.push({ id: 'usuarios', label: 'Usuarios', icon: Users });
  }

  return (
    <nav className="sidebar">
      <ul className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                onClick={() => setActiveSection(item.id)}
                className={`w-full text-left flex items-center gap-3 px-6 py-3 font-medium text-sm transition-all border-l-4 ${
                  activeSection === item.id
                    ? 'bg-accent/10 text-accent border-accent'
                    : 'border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="p-4 mt-8 border-t border-gray-200 dark:border-gray-800">
        <a
          href="/verificar"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs font-semibold text-accent hover:underline px-2 py-1"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Portal Público de Validación</span>
        </a>
      </div>
    </nav>
  );
}
