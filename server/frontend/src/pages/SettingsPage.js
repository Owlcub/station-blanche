import React, { useState, useEffect } from 'react';
import { Settings, Key, Mail, Database, X, Copy, Check, AlertCircle, Trash2, Plus, Search, Play } from 'lucide-react';
import './SharedPages.css';
import './SettingsPage.css';

const API_BASE = 'http://localhost:3100';

function SettingsPage() {
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);

  return (
    <div className="page">
      <div className="page-header">
        <h1><Settings size={28} /> Configuration</h1>
        <p>Paramètres du serveur central</p>
      </div>

      <div className="settings-grid">
        <div className="setting-card">
          <div className="setting-icon">
            <Key size={24} />
          </div>
          <h3>Clés API</h3>
          <p>Gérer les clés API pour les stations</p>
          <button className="btn-primary" onClick={() => setShowApiKeyModal(true)}>
            Gérer les clés
          </button>
        </div>

        <div className="setting-card">
          <div className="setting-icon">
            <Mail size={24} />
          </div>
          <h3>Alertes Email</h3>
          <p>Configuration SMTP pour les alertes</p>
          <button className="btn-primary" onClick={() => setShowSmtpModal(true)}>
            Configurer
          </button>
        </div>

        <div className="setting-card">
          <div className="setting-icon">
            <Database size={24} />
          </div>
          <h3>Base de données</h3>
          <p>Maintenance et sauvegardes</p>
          <button className="btn-primary" onClick={() => setShowDatabaseModal(true)}>
            Accéder
          </button>
        </div>
      </div>

      {showApiKeyModal && <ApiKeyModal onClose={() => setShowApiKeyModal(false)} />}
      {showSmtpModal && <SmtpModal onClose={() => setShowSmtpModal(false)} />}
      {showDatabaseModal && <DatabaseModal onClose={() => setShowDatabaseModal(false)} />}
    </div>
  );
}

// API Key Modal Component
function ApiKeyModal({ onClose }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/api-keys`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setApiKeys(data.keys);
      }
    } catch (err) {
      setError('Erreur lors du chargement des clés');
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) {
      setError('Le nom est requis');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/v1/api-keys/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newKeyName })
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedKey(data.api_key);
        setNewKeyName('');
        setShowGenerateForm(false);
        loadApiKeys();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Erreur lors de la génération de la clé');
    }
  };

  const revokeApiKey = async (id) => {
    if (!window.confirm('Voulez-vous vraiment révoquer cette clé ?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/v1/api-keys/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        loadApiKeys();
      }
    } catch (err) {
      setError('Erreur lors de la révocation');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Key size={24} />
            Gestion des clés API
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {generatedKey && (
            <div className="api-key-display">
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#047857' }}>
                <Check size={20} style={{ display: 'inline', verticalAlign: 'middle' }} /> Clé API générée
              </h4>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#6b7280' }}>
                Copiez cette clé maintenant, elle ne sera plus jamais affichée
              </p>
              <div className="api-key-value">
                <code>{generatedKey}</code>
                <button className="btn-copy" onClick={() => copyToClipboard(generatedKey)}>
                  {copiedKey ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>
          )}

          {!showGenerateForm ? (
            <button className="btn btn-primary" onClick={() => setShowGenerateForm(true)}>
              <Plus size={18} />
              Générer une nouvelle clé
            </button>
          ) : (
            <div className="form-group">
              <label className="form-label">Nom de la clé</label>
              <input
                type="text"
                className="form-input"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Ex: Station principale"
                autoFocus
              />
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary btn-sm" onClick={generateApiKey}>
                  Générer
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  setShowGenerateForm(false);
                  setNewKeyName('');
                }}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading">Chargement...</div>
          ) : apiKeys.length === 0 ? (
            <div className="empty-state">
              <Key size={48} />
              <h3>Aucune clé API</h3>
              <p>Générez votre première clé pour connecter une station</p>
            </div>
          ) : (
            <table className="api-keys-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Préfixe</th>
                  <th>Créée le</th>
                  <th>Dernière utilisation</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
                  <tr key={key.id}>
                    <td className="font-medium">{key.name}</td>
                    <td><code>{key.key_prefix}...</code></td>
                    <td>{new Date(key.created_at).toLocaleDateString()}</td>
                    <td>{key.last_used ? new Date(key.last_used).toLocaleDateString() : 'Jamais'}</td>
                    <td>
                      {key.active ? (
                        <span className="status-badge status-success">Active</span>
                      ) : (
                        <span className="status-badge status-offline">Révoquée</span>
                      )}
                    </td>
                    <td>
                      {key.active && (
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => revokeApiKey(key.id)}
                          title="Révoquer"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

// SMTP Modal Component
function SmtpModal({ onClose }) {
  const [config, setConfig] = useState({
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    from_email: '',
    from_name: 'Station Blanche'
  });
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/smtp-config`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success && data.config) {
        setConfig({ ...config, ...data.config, password: '' });
      }
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const testConfig = async () => {
    setTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/smtp-config/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config)
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Email de test envoyé avec succès');
      } else {
        setError(data.error + (data.details ? ': ' + data.details : ''));
      }
    } catch (err) {
      setError('Erreur lors du test');
    } finally {
      setTesting(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/smtp-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config)
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Configuration sauvegardée');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Mail size={24} />
            Configuration SMTP
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <Check size={20} />
              <span>{success}</span>
            </div>
          )}

          {loading ? (
            <div className="loading">Chargement...</div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Serveur SMTP</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.host}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                  placeholder="smtp.example.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Port</label>
                <input
                  type="number"
                  className="form-input"
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                />
                <small className="form-help">587 (TLS) ou 465 (SSL)</small>
              </div>

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  id="smtp-secure"
                  checked={config.secure}
                  onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
                />
                <label htmlFor="smtp-secure">Utiliser SSL/TLS</label>
              </div>

              <div className="form-group">
                <label className="form-label">Nom d'utilisateur</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.user}
                  onChange={(e) => setConfig({ ...config, user: e.target.value })}
                  placeholder="utilisateur@example.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mot de passe</label>
                <input
                  type="password"
                  className="form-input"
                  value={config.password}
                  onChange={(e) => setConfig({ ...config, password: e.target.value })}
                  placeholder="Mot de passe SMTP"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email expéditeur</label>
                <input
                  type="email"
                  className="form-input"
                  value={config.from_email}
                  onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
                  placeholder="noreply@example.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nom expéditeur</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.from_name}
                  onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                  placeholder="Station Blanche"
                />
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={testConfig} disabled={testing || loading}>
            <Play size={18} />
            {testing ? 'Test en cours...' : 'Tester'}
          </button>
          <button className="btn btn-primary" onClick={saveConfig} disabled={saving || loading}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Database Modal Component
function DatabaseModal({ onClose }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/database/tables`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setTables(data.tables);
      }
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (tableName) => {
    setSelectedTable(tableName);
    setTableData(null);
    setQueryResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/database/tables/${tableName}?limit=50`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setTableData(data.table);
      }
    } catch (err) {
      setError('Erreur lors du chargement de la table');
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) return;

    setError(null);
    setQueryResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/database/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query })
      });

      const data = await response.json();
      if (data.success) {
        setQueryResult(data);
      } else {
        setError(data.error + (data.details ? ': ' + data.details : ''));
      }
    } catch (err) {
      setError('Erreur lors de l\'exécution de la requête');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Database size={24} />
            Explorateur de base de données
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="database-viewer">
            <div className="database-sidebar">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Tables</h3>
              {loading ? (
                <div className="loading">Chargement...</div>
              ) : (
                <ul className="table-list">
                  {tables.map((table) => (
                    <li
                      key={table.name}
                      className={`table-list-item ${selectedTable === table.name ? 'active' : ''}`}
                      onClick={() => loadTableData(table.name)}
                    >
                      <div>{table.name}</div>
                      <div className="table-info">
                        <span>{table.row_count} lignes</span>
                        <span>{table.column_count} cols</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="database-content">
              <div className="query-editor">
                <label className="form-label">Requête SQL (SELECT uniquement)</label>
                <textarea
                  className="form-textarea"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="SELECT * FROM stations LIMIT 10"
                />
                <div className="query-actions">
                  <button className="btn btn-primary btn-sm" onClick={executeQuery}>
                    <Play size={16} />
                    Exécuter
                  </button>
                </div>
              </div>

              {queryResult && (
                <div className="data-grid">
                  <p style={{ marginBottom: '0.75rem', color: '#6b7280', fontSize: '0.9rem' }}>
                    {queryResult.rowCount} résultat(s)
                  </p>
                  {queryResult.rows.length > 0 && (
                    <table>
                      <thead>
                        <tr>
                          {Object.keys(queryResult.rows[0]).map((col) => (
                            <th key={col}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.rows.map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((val, j) => (
                              <td key={j}>{val !== null ? String(val) : 'NULL'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {tableData && !queryResult && (
                <div className="data-grid">
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>{tableData.name}</h3>
                  <p style={{ marginBottom: '0.75rem', color: '#6b7280', fontSize: '0.9rem' }}>
                    {tableData.total_rows} lignes au total (affichage de 50 max)
                  </p>
                  {tableData.rows.length > 0 ? (
                    <table>
                      <thead>
                        <tr>
                          {tableData.columns.map((col) => (
                            <th key={col.column_name}>{col.column_name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.rows.map((row, i) => (
                          <tr key={i}>
                            {tableData.columns.map((col) => (
                              <td key={col.column_name}>
                                {row[col.column_name] !== null ? String(row[col.column_name]) : 'NULL'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state">
                      <p>Aucune donnée dans cette table</p>
                    </div>
                  )}
                </div>
              )}

              {!selectedTable && !queryResult && (
                <div className="empty-state">
                  <Database size={48} />
                  <h3>Sélectionnez une table</h3>
                  <p>Choisissez une table dans la liste pour afficher son contenu</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
