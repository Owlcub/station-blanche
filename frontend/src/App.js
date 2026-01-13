import React, { useState } from 'react';
import './App.css';
import USBScanner from './components/pages/ScanTools/USBScanner';
import RemotePCScanner from './components/pages/ScanTools/RemotePCScanner';
import USBTransfer from './components/pages/ScanTools/USBTransfer';
import AdminPanel from './components/pages/Admin/AdminPanel';
import { Usb, Monitor, ArrowLeftRight, Settings } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('usb');

  // Si on accède directement à /admin via URL
  if (window.location.pathname === '/admin') {
    return <AdminPanel />;
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>🔒 Station Blanche - Scanner de Sécurité</h1>
        <p>Scan USB, PC Windows et transfert sécurisé</p>
      </header>

      <nav className="app-nav">
        <button
          className={activeTab === 'usb' ? 'active' : ''}
          onClick={() => setActiveTab('usb')}
        >
          <Usb size={20} />
          Scanner USB
        </button>
        <button
          className={activeTab === 'transfer' ? 'active' : ''}
          onClick={() => setActiveTab('transfer')}
        >
          <ArrowLeftRight size={20} />
          Transfert USB
        </button>
        <button
          className={activeTab === 'pc' ? 'active' : ''}
          onClick={() => setActiveTab('pc')}
        >
          <Monitor size={20} />
          Scanner PC
        </button>
        <button
          className="admin-link"
          onClick={() => window.location.href = '/admin'}
        >
          <Settings size={20} />
          Admin
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'usb' && <USBScanner />}
        {activeTab === 'transfer' && <USBTransfer />}
        {activeTab === 'pc' && <RemotePCScanner />}
      </main>

      <footer className="app-footer">
        <p>Station Blanche v1.0 - Analyse de sécurité USB et PC</p>
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.8 }}>
          Développé par <strong>CupaDev</strong> & <strong>Owlcub</strong>
        </p>
      </footer>
    </div>
  );
}

export default App;
