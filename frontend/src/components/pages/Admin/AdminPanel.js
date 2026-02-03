import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css';
import { Lock, Activity, RefreshCw, Download, Terminal, Settings, Power, Shield } from 'lucide-react';
import API_URL from '../../../config';
import CertificationManager from './CertificationManager';

function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Admin data
  const [stats, setStats] = useState(null);
  const [backendLogs, setBackendLogs] = useState('');
  const [frontendLogs, setFrontendLogs] = useState('');
  const [activeTab, setActiveTab] = useState('stats');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/status`, {
        withCredentials: true
      });
      setIsAuthenticated(response.data.authenticated);
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  };

  const handleLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/admin/login`,
        { username, password },
        { withCredentials: true }
      );
      setIsAuthenticated(true);
      setUsername('');
      setPassword('');
      loadStats();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/api/admin/logout`, {}, {
        withCredentials: true
      });
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/stats`, {
        withCredentials: true
      });
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadBackendLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/logs/backend`, {
        withCredentials: true
      });
      setBackendLogs(response.data.logs);
    } catch (err) {
      console.error('Failed to load backend logs:', err);
    }
  };

  const loadFrontendLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/logs/frontend`, {
        withCredentials: true
      });
      setFrontendLogs(response.data.logs);
    } catch (err) {
      console.error('Failed to load frontend logs:', err);
    }
  };

  const handleUpdate = async () => {
    if (!window.confirm('Mettre à jour la station depuis GitHub ?')) return;

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/admin/update`, {}, {
        withCredentials: true
      });
      alert('Mise à jour réussie ! Redémarrez les services.');
    } catch (err) {
      alert('Erreur : ' + (err.response?.data?.error || 'Échec de la mise à jour'));
    } finally {
      setLoading(false);
    }
  };

  const handleRestartBackend = async () => {
    if (!window.confirm('Redémarrer le backend ?')) return;

    try {
      await axios.post(`${API_URL}/api/admin/restart/backend`, {}, {
        withCredentials: true
      });
      alert('Backend redémarré');
    } catch (err) {
      alert('Erreur : ' + (err.response?.data?.error || 'Échec du redémarrage'));
    }
  };

  const handleRestartFrontend = async () => {
    if (!window.confirm('Redémarrer le frontend ?')) return;

    try {
      await axios.post(`${API_URL}/api/admin/restart/frontend`, {}, {
        withCredentials: true
      });
      alert('Frontend redémarré');
    } catch (err) {
      alert('Erreur : ' + (err.response?.data?.error || 'Échec du redémarrage'));
    }
  };

  const handleRestartAll = async () => {
    if (!window.confirm('Redémarrer tous les services ?')) return;

    try {
      await axios.post(`${API_URL}/api/admin/restart/all`, {}, {
        withCredentials: true
      });
      alert('Tous les services redémarrés');
    } catch (err) {
      alert('Erreur : ' + (err.response?.data?.error || 'Échec du redémarrage'));
    }
  };

  const handleRebootSystem = async () => {
    if (!window.confirm('⚠️ ATTENTION : Redémarrer complètement la station ?\n\nLa station va redémarrer immédiatement.')) return;

    try {
      await axios.post(`${API_URL}/api/admin/reboot`, {}, {
        withCredentials: true
      });
      alert('La station va redémarrer dans 5 secondes...');

      // Déconnexion automatique après 3 secondes
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (err) {
      alert('Erreur : ' + (err.response?.data?.error || 'Échec du redémarrage'));
    }
  };

  // Interface de login
  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <Lock size={48} />
            <h2>Administration Station Blanche</h2>
            <p>Accès sécurisé</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <input
                type="text"
                placeholder="Nom d'utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={loading || !username || !password} className="btn-login">
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            <button
              type="button"
              className="btn-back"
              onClick={() => window.location.href = '/'}
            >
              ← Retour à l'accueil
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Interface admin authentifiée
  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1><Settings size={24} /> Panneau d'Administration</h1>
        <button onClick={handleLogout} className="btn-logout">
          Déconnexion
        </button>
      </div>

      <div className="admin-nav">
        <button
          className={activeTab === 'stats' ? 'active' : ''}
          onClick={() => { setActiveTab('stats'); loadStats(); }}
        >
          <Activity size={18} /> Statistiques
        </button>
        <button
          className={activeTab === 'logs' ? 'active' : ''}
          onClick={() => { setActiveTab('logs'); loadBackendLogs(); loadFrontendLogs(); }}
        >
          <Terminal size={18} /> Logs
        </button>
        <button
          className={activeTab === 'actions' ? 'active' : ''}
          onClick={() => setActiveTab('actions')}
        >
          <RefreshCw size={18} /> Actions
        </button>
        <button
          className={activeTab === 'certification' ? 'active' : ''}
          onClick={() => setActiveTab('certification')}
        >
          <Shield size={18} /> Certificats USB
        </button>
      </div>

      <div className="admin-content">
        {/* STATISTIQUES */}
        {activeTab === 'stats' && (
          <div className="admin-stats">
            <h2>Statistiques Système</h2>
            {stats ? (
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Uptime</h3>
                  <p>{stats.uptime}</p>
                </div>
                <div className="stat-card">
                  <h3>Mémoire</h3>
                  <p>{stats.memory}</p>
                </div>
                <div className="stat-card">
                  <h3>Disque</h3>
                  <p>{stats.disk}</p>
                </div>
                <div className="stat-card">
                  <h3>CPU</h3>
                  <p>{stats.cpu}%</p>
                </div>
              </div>
            ) : (
              <p>Chargement des statistiques...</p>
            )}
          </div>
        )}

        {/* LOGS */}
        {activeTab === 'logs' && (
          <div className="admin-logs">
            <h2>Logs Système</h2>

            <div className="logs-section">
              <h3>Backend (dernières 100 lignes)</h3>
              <pre className="log-output">{backendLogs || 'Chargement...'}</pre>
            </div>

            <div className="logs-section">
              <h3>Frontend (dernières 100 lignes)</h3>
              <pre className="log-output">{frontendLogs || 'Chargement...'}</pre>
            </div>
          </div>
        )}

        {/* ACTIONS */}
        {activeTab === 'actions' && (
          <div className="admin-actions">
            <h2>Actions Système</h2>

            <div className="action-group">
              <h3><Download size={20} /> Mise à jour</h3>
              <p>Mettre à jour la station depuis GitHub</p>
              <button onClick={handleUpdate} disabled={loading}>
                {loading ? 'Mise à jour...' : 'Mettre à jour'}
              </button>
            </div>

            <div className="action-group">
              <h3><RefreshCw size={20} /> Redémarrage Backend</h3>
              <p>Redémarrer le serveur backend (API)</p>
              <button onClick={handleRestartBackend}>
                Redémarrer Backend
              </button>
            </div>

            <div className="action-group">
              <h3><RefreshCw size={20} /> Redémarrage Frontend</h3>
              <p>Redémarrer le serveur frontend (Interface web)</p>
              <button onClick={handleRestartFrontend}>
                Redémarrer Frontend
              </button>
            </div>

            <div className="action-group">
              <h3><RefreshCw size={20} /> Redémarrage Complet</h3>
              <p>Redémarrer tous les services de la station</p>
              <button onClick={handleRestartAll} className="btn-danger">
                Redémarrer Tous les Services
              </button>
            </div>

            <div className="action-group">
              <h3><Power size={20} /> Redémarrage Système</h3>
              <p>⚠️ Redémarrer complètement la station (reboot)</p>
              <button onClick={handleRebootSystem} className="btn-danger-reboot">
                Redémarrer la Station
              </button>
            </div>
          </div>
        )}

        {/* CERTIFICATION */}
        {activeTab === 'certification' && (
          <CertificationManager />
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
