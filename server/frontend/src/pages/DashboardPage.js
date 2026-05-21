import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Server, Shield, FileText, AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import './DashboardPage.css';

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentStations, setRecentStations] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    // WebSocket for real-time updates
    const socket = io({
      auth: { token: 'dashboard' }
    });

    socket.on('station:heartbeat', handleStationUpdate);
    socket.on('threat:detected', handleThreatDetected);
    socket.on('scan:completed', handleScanCompleted);

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, stationsRes, alertsRes] = await Promise.all([
        axios.get('/api/v1/dashboard/stats'),
        axios.get('/api/v1/stations'),
        axios.get('/api/v1/alerts?limit=5')
      ]);

      setStats(statsRes.data.stats);
      setRecentStations(stationsRes.data.stations.slice(0, 5));
      setRecentAlerts(alertsRes.data.alerts || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStationUpdate = (data) => {
    console.log('Station update:', data);
    loadData();
  };

  const handleThreatDetected = (data) => {
    console.log('Threat detected:', data);
    loadData();
  };

  const handleScanCompleted = (data) => {
    console.log('Scan completed:', data);
  };

  if (loading) {
    return <div className="loading">Chargement du dashboard...</div>;
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Vue d'ensemble du réseau de stations</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stations">
            <Server size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Stations Actives</div>
            <div className="stat-value">{stats?.stations || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon certificates">
            <Shield size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Certificats Valides</div>
            <div className="stat-value">{stats?.certificates || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon scans">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Scans (7 jours)</div>
            <div className="stat-value">{stats?.scans_7d || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon threats">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Alertes Actives</div>
            <div className="stat-value">{stats?.active_threats || 0}</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-grid">
        {/* Recent Stations */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2><Server size={20} /> Stations Récentes</h2>
          </div>
          <div className="card-content">
            {recentStations.length === 0 ? (
              <p className="empty-state">Aucune station enregistrée</p>
            ) : (
              <div className="station-list">
                {recentStations.map(station => (
                  <div key={station.id} className="station-item">
                    <div className="station-info">
                      <div className="station-name">{station.name}</div>
                      <div className="station-location">{station.location || 'Non spécifié'}</div>
                    </div>
                    <div className={`station-status status-${station.status}`}>
                      {station.status === 'online' && '● En ligne'}
                      {station.status === 'offline' && '○ Hors ligne'}
                      {station.status === 'error' && '✗ Erreur'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2><AlertTriangle size={20} /> Alertes Récentes</h2>
          </div>
          <div className="card-content">
            {recentAlerts.length === 0 ? (
              <p className="empty-state">Aucune alerte</p>
            ) : (
              <div className="alert-list">
                {recentAlerts.map(alert => (
                  <div key={alert.id} className={`alert-item priority-${alert.priority}`}>
                    <div className="alert-icon">
                      <AlertTriangle size={18} />
                    </div>
                    <div className="alert-info">
                      <div className="alert-type">{alert.threat_type}</div>
                      <div className="alert-time">
                        {new Date(alert.created_at).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Chart Placeholder */}
      <div className="dashboard-card full-width">
        <div className="card-header">
          <h2><Activity size={20} /> Activité des 7 derniers jours</h2>
        </div>
        <div className="card-content">
          <div className="chart-placeholder">
            <TrendingUp size={48} />
            <p>Graphique d'activité (à venir)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
