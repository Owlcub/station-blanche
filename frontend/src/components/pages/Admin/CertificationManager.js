import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Shield,
  Download,
  Upload,
  Plus,
  Trash2,
  Clock,
  Server,
  Network,
  Key,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import API_URL from '../../../config';
import './CertificationManager.css';

function CertificationManager() {
  const [config, setConfig] = useState(null);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Form states
  const [newDomain, setNewDomain] = useState({
    name: '',
    network_segment: '',
    expiration_policy: 'standard'
  });

  const [editPolicies, setEditPolicies] = useState(false);
  const [policies, setPolicies] = useState({});

  const [importData, setImportData] = useState('');

  useEffect(() => {
    loadConfig();
    loadDomains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/certification/config`, {
        withCredentials: true
      });
      setConfig(response.data.config);
      setPolicies(response.data.config.expiration_policies);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load config:', err);
      showMessage('Erreur lors du chargement de la configuration', 'error');
    }
  };

  const loadDomains = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/certification/domains`, {
        withCredentials: true
      });
      setDomains(response.data.domains);
    } catch (err) {
      console.error('Failed to load domains:', err);
    }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/certification/domains`, newDomain, {
        withCredentials: true
      });
      showMessage('Domaine ajouté avec succès');
      setNewDomain({ name: '', network_segment: '', expiration_policy: 'standard' });
      loadDomains();
    } catch (err) {
      showMessage(err.response?.data?.error || 'Erreur lors de l\'ajout', 'error');
    }
  };

  const handleDeleteDomain = async (domainId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce domaine ?')) return;

    try {
      await axios.delete(`${API_URL}/api/certification/domains/${domainId}`, {
        withCredentials: true
      });
      showMessage('Domaine supprimé');
      loadDomains();
    } catch (err) {
      showMessage('Erreur lors de la suppression', 'error');
    }
  };

  const handleSavePolicies = async () => {
    try {
      await axios.put(`${API_URL}/api/certification/expiration-policies`,
        { policies },
        { withCredentials: true }
      );
      showMessage('Politiques d\'expiration mises à jour');
      setEditPolicies(false);
      loadConfig();
    } catch (err) {
      showMessage('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/certification/export`, {
        withCredentials: true,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `station-${config.station_id}-export.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      showMessage('Configuration exportée avec succès');
    } catch (err) {
      showMessage('Erreur lors de l\'export', 'error');
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(importData);
      await axios.post(`${API_URL}/api/certification/import`,
        { importData: data },
        { withCredentials: true }
      );
      showMessage('Station importée avec succès');
      setImportData('');
    } catch (err) {
      showMessage(err.response?.data?.error || 'Erreur lors de l\'import', 'error');
    }
  };

  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImportData(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const formatDuration = (seconds) => {
    if (seconds < 3600) return `${seconds / 60} minutes`;
    if (seconds < 86400) return `${seconds / 3600} heures`;
    return `${seconds / 86400} jours`;
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="certification-manager">
      <div className="cert-header">
        <Shield className="cert-icon" size={32} />
        <h2>Gestion des Certificats USB</h2>
      </div>

      {message && (
        <div className={`cert-message ${messageType}`}>
          {messageType === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{message}</span>
        </div>
      )}

      {/* Station Info */}
      <div className="cert-section">
        <h3><Server size={20} /> Informations de la Station</h3>
        <div className="cert-info-grid">
          <div className="cert-info-item">
            <label>Station ID</label>
            <code>{config.station_id}</code>
          </div>
          <div className="cert-info-item">
            <label>Algorithme</label>
            <code>RSA-2048 / SHA-256</code>
          </div>
        </div>
      </div>

      {/* Expiration Policies */}
      <div className="cert-section">
        <div className="section-header">
          <h3><Clock size={20} /> Politiques d'Expiration</h3>
          <button
            className="btn-edit"
            onClick={() => setEditPolicies(!editPolicies)}
          >
            {editPolicies ? 'Annuler' : 'Modifier'}
          </button>
        </div>

        <div className="policies-grid">
          {Object.entries(policies).map(([key, value]) => (
            <div key={key} className="policy-item">
              <label>{key}</label>
              {editPolicies ? (
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setPolicies({
                    ...policies,
                    [key]: parseInt(e.target.value)
                  })}
                  className="policy-input"
                />
              ) : (
                <span className="policy-value">{formatDuration(value)}</span>
              )}
            </div>
          ))}
        </div>

        {editPolicies && (
          <button className="btn-primary" onClick={handleSavePolicies}>
            Enregistrer les modifications
          </button>
        )}
      </div>

      {/* Domains Management */}
      <div className="cert-section">
        <h3><Network size={20} /> Domaines Autorisés</h3>

        <form onSubmit={handleAddDomain} className="domain-form">
          <input
            type="text"
            placeholder="Nom du domaine (ex: entreprise.local)"
            value={newDomain.name}
            onChange={(e) => setNewDomain({ ...newDomain, name: e.target.value })}
            required
            className="input-text"
          />
          <input
            type="text"
            placeholder="Segment réseau (optionnel, ex: 192.168.1.0/24)"
            value={newDomain.network_segment}
            onChange={(e) => setNewDomain({ ...newDomain, network_segment: e.target.value })}
            className="input-text"
          />
          <select
            value={newDomain.expiration_policy}
            onChange={(e) => setNewDomain({ ...newDomain, expiration_policy: e.target.value })}
            className="input-select"
          >
            {Object.keys(policies).map(policy => (
              <option key={policy} value={policy}>
                {policy} ({formatDuration(policies[policy])})
              </option>
            ))}
          </select>
          <button type="submit" className="btn-add">
            <Plus size={16} /> Ajouter
          </button>
        </form>

        <div className="domains-list">
          {domains.length === 0 ? (
            <p className="empty-state">Aucun domaine configuré</p>
          ) : (
            domains.map(domain => (
              <div key={domain.id} className="domain-card">
                <div className="domain-info">
                  <h4>{domain.name}</h4>
                  {domain.network_segment && (
                    <p className="network-segment">
                      <Network size={14} /> {domain.network_segment}
                    </p>
                  )}
                  <p className="expiration-policy">
                    <Clock size={14} /> {domain.expiration_policy} - {formatDuration(policies[domain.expiration_policy])}
                  </p>
                  <p className="created-date">Créé le {new Date(domain.created).toLocaleString()}</p>
                </div>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteDomain(domain.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Export / Import */}
      <div className="cert-section">
        <h3><Key size={20} /> Export / Import Configuration</h3>

        <div className="export-import-grid">
          <div className="export-box">
            <h4>Exporter</h4>
            <p>Téléchargez la clé publique et la configuration pour la partager avec d'autres stations.</p>
            <button className="btn-export" onClick={handleExport}>
              <Download size={16} /> Exporter la configuration
            </button>
          </div>

          <div className="import-box">
            <h4>Importer</h4>
            <p>Importez une clé publique d'une autre station pour accepter ses certificats.</p>

            <label className="file-upload-btn">
              <Upload size={16} /> Choisir un fichier
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                style={{ display: 'none' }}
              />
            </label>

            {importData && (
              <form onSubmit={handleImport} className="import-form">
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  rows="6"
                  className="import-textarea"
                  placeholder="Collez ici la configuration JSON d'une autre station"
                />
                <button type="submit" className="btn-primary">
                  Importer
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* GPO Documentation - Mode Kiosque */}
      <div className="cert-section" style={{background: '#fef3c7', borderLeft: '4px solid #f59e0b'}}>
        <h3>📖 Guide de déploiement GPO Windows</h3>
        <p style={{marginBottom: '15px', color: '#92400e'}}>
          Le guide GPO est automatiquement copié sur chaque clé USB certifiée dans le dossier racine.
        </p>
        <div style={{background: 'white', padding: '15px', borderRadius: '6px', marginBottom: '15px'}}>
          <p style={{fontSize: '13px', color: '#92400e', margin: 0}}>
            <strong>📋 Instructions :</strong>
          </p>
          <ol style={{marginLeft: '20px', marginTop: '8px', fontSize: '13px', color: '#92400e'}}>
            <li>Scannez une clé USB avec le scanner</li>
            <li>Si propre, certifiez-la</li>
            <li>Le guide <code>CERTIFICATION-USB-GPO.md</code> sera automatiquement copié</li>
            <li>Récupérez le guide depuis la clé sur votre serveur AD</li>
          </ol>
        </div>
        <p style={{fontSize: '12px', color: '#92400e', fontStyle: 'italic'}}>
          💡 Le guide contient les scripts PowerShell prêts à l'emploi pour bloquer les clés USB non certifiées.
        </p>
      </div>

      {/* Help Section */}
      <div className="cert-section help-section">
        <h3>ℹ️ Comment utiliser la certification USB ?</h3>
        <ol>
          <li><strong>Configurez vos domaines</strong> - Ajoutez les domaines d'entreprise autorisés</li>
          <li><strong>Scannez une clé USB</strong> - Utilisez le scanner USB normal</li>
          <li><strong>Certifiez la clé</strong> - Après un scan propre, cliquez sur "Certifier"</li>
          <li><strong>Déploiement GPO</strong> - Téléchargez le guide ci-dessus et suivez les instructions</li>
        </ol>
      </div>
    </div>
  );
}

export default CertificationManager;
