import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import KeyModal from './components/KeyModal';
import SignModal from './components/SignModal';
import DashboardView from './pages/DashboardView';
import DocumentsView from './pages/DocumentsView';
import SignView from './pages/SignView';
import VerifyView from './pages/VerifyView';
import HistoryView from './pages/HistoryView';
import UsersView from './pages/UsersView';
import VerifyPublic from './pages/VerifyPublic';

function MainApp() {
  const { currentUser, loading } = useAuth();
  const [activeSection, setActiveSection] = useState('inicio');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [selectedSignDoc, setSelectedSignDoc] = useState(null);

  // Comprobar si la ruta actual es /verificar
  if (window.location.pathname === '/verificar') {
    return <VerifyPublic />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold tracking-wide">Cargando Plataforma Criptográfica...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="app-layout min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors">
      <Header onOpenKeyModal={() => setIsKeyModalOpen(true)} />

      <div className="dashboard-body flex-1 flex overflow-hidden">
        <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />

        <main className="main-content flex-1 p-8 overflow-y-auto">
          {activeSection === 'inicio' && <DashboardView />}
          {activeSection === 'documentos' && <DocumentsView onOpenSign={(doc) => setSelectedSignDoc(doc)} />}
          {activeSection === 'firmar' && <SignView onOpenSign={(doc) => setSelectedSignDoc(doc)} onOpenKeyModal={() => setIsKeyModalOpen(true)} />}
          {activeSection === 'verificar' && <VerifyView />}
          {activeSection === 'historial' && <HistoryView />}
          {activeSection === 'usuarios' && <UsersView />}
        </main>
      </div>

      <KeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
      />

      <SignModal
        document={selectedSignDoc}
        isOpen={!!selectedSignDoc}
        onClose={() => setSelectedSignDoc(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
