import React, { useState } from 'react';
import './App.css';
import USBScanner from './components/pages/ScanTools/USBScanner';
import USBTransferGuided from './components/pages/ScanTools/USBTransferGuided';
import AdminPanel from './components/pages/Admin/AdminPanel';
import GlobalKeyboard from './components/GlobalKeyboard/GlobalKeyboard';
import { Usb, ArrowLeftRight, Settings } from 'lucide-react';

function App() {
  const [activeView, setActiveView] = useState(null);

  // Si on accède directement à /admin via URL
  if (window.location.pathname === '/admin') {
    return <AdminPanel />;
  }

  // Vue d'accueil avec cartes
  if (!activeView) {
    return (
      <div className="App">
        <header className="app-header">
          <div className="header-logo">
            <img src="/logo-owlcub.png" alt="Owlcub Logo" className="owlcub-logo" />
          </div>
          <div className="header-content">
            <h1>OWLCUB - Station Blanche</h1>
            <p>Scanner de Sécurité USB</p>
          </div>
          <button
            className="admin-btn-header"
            onClick={() => window.location.href = '/admin'}
            title="Administration"
          >
            <Settings size={24} />
          </button>
        </header>

        <main className="app-main-cards">
          <div className="main-cards-container">
            <div
              className="main-card"
              onClick={() => setActiveView('scan')}
            >
              <div className="card-icon">
                <Usb size={64} />
              </div>
              <h2>Scanner USB</h2>
              <p>Analyser une clé USB à la recherche de menaces</p>
            </div>

            <div
              className="main-card"
              onClick={() => setActiveView('transfer')}
            >
              <div className="card-icon">
                <ArrowLeftRight size={64} />
              </div>
              <h2>Transfert USB</h2>
              <p>Transférer des fichiers de manière sécurisée entre deux clés</p>
            </div>
          </div>
        </main>

        <footer className="app-footer">
          <p>Station Blanche v1.0 - Analyse de sécurité USB</p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.8 }}>
            Développé par <strong>CupaDev</strong>
          </p>
        </footer>

        <GlobalKeyboard />
      </div>
    );
  }

  // Vue avec composant actif
  return (
    <div className="App">
      <header className="app-header">
        <button
          className="back-button"
          onClick={() => setActiveView(null)}
        >
          ← Retour
        </button>
        <div className="header-logo">
          <img src="/logo-owlcub.png" alt="Owlcub Logo" className="owlcub-logo" />
        </div>
        <div className="header-content">
          <h1>OWLCUB - Station Blanche</h1>
          <p>{activeView === 'scan' ? 'Scanner USB' : 'Transfert USB'}</p>
        </div>
        <button
          className="admin-btn-header"
          onClick={() => window.location.href = '/admin'}
          title="Administration"
        >
          <Settings size={24} />
        </button>
      </header>

      <main className="app-main">
        {activeView === 'scan' && <USBScanner />}
        {activeView === 'transfer' && <USBTransferGuided />}
      </main>

      <footer className="app-footer">
        <p>Station Blanche v1.0 - Analyse de sécurité USB</p>
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.8 }}>
          Développé par <strong>CupaDev</strong>
        </p>
      </footer>

      <GlobalKeyboard />
    </div>
  );
}

export default App;
