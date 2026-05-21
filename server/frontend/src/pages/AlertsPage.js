import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle } from 'lucide-react';
import './SharedPages.css';

function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await axios.get('/api/v1/alerts?limit=100');
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1><AlertTriangle size={28} /> Alertes</h1>
        <p>Toutes les menaces détectées</p>
      </div>

      <div className="table-card">
        {alerts.length === 0 ? (
          <div className="empty-state-success">
            <AlertTriangle size={48} />
            <p>Aucune alerte active</p>
            <small>Toutes les menaces ont été traitées</small>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Priorité</th>
                <th>Type</th>
                <th>Station</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(alert => (
                <tr key={alert.id}>
                  <td>{new Date(alert.created_at).toLocaleString('fr-FR')}</td>
                  <td>
                    <span className={`priority-badge priority-${alert.priority}`}>
                      {alert.priority}
                    </span>
                  </td>
                  <td>{alert.threat_type}</td>
                  <td>{alert.station_name || '-'}</td>
                  <td>
                    {alert.acknowledged ? (
                      <span className="status-badge status-success">Traitée</span>
                    ) : (
                      <span className="status-badge status-warning">En attente</span>
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

export default AlertsPage;
