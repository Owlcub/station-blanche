import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, AlertCircle, CheckCircle } from 'lucide-react';
import './SharedPages.css';

function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const response = await axios.get('/api/v1/logs/scan?limit=50');
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1><FileText size={28} /> Logs de Scan</h1>
        <p>Historique de tous les scans effectués</p>
      </div>

      <div className="table-card">
        {logs.length === 0 ? (
          <p className="empty-state">Aucun log</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Station</th>
                <th>UUID USB</th>
                <th>Fichiers</th>
                <th>Infectés</th>
                <th>Résultat</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString('fr-FR')}</td>
                  <td>{log.station_name || '-'}</td>
                  <td><code>{log.usb_uuid || '-'}</code></td>
                  <td>{log.total_files || 0}</td>
                  <td className={log.infected_files > 0 ? 'text-danger' : ''}>
                    {log.infected_files || 0}
                  </td>
                  <td>
                    {log.clamav_clean ? (
                      <span className="status-badge status-success">
                        <CheckCircle size={14} /> Clean
                      </span>
                    ) : (
                      <span className="status-badge status-danger">
                        <AlertCircle size={14} /> Menaces
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default LogsPage;
