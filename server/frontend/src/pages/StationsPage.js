import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Server, MapPin, Activity, Trash2, Unplug } from 'lucide-react';
import './SharedPages.css';

function StationsPage() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    try {
      const response = await axios.get('/api/v1/stations');
      setStations(response.data.stations);
    } catch (error) {
      console.error('Error loading stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (stationId) => {
    if (!window.confirm('Déconnecter cette station ? Elle redeviendra autonome.')) return;

    try {
      await axios.post(`/api/v1/stations/${stationId}/disconnect`);
      alert('Station déconnectée - mode autonome activé');
      loadStations();
    } catch (error) {
      alert('Erreur lors de la déconnexion');
    }
  };

  const handleDelete = async (stationId) => {
    if (!window.confirm('Supprimer cette station définitivement ?')) return;

    try {
      await axios.delete(`/api/v1/stations/${stationId}`);
      loadStations();
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1><Server size={28} /> Stations</h1>
        <p>Gestion des stations connectées au réseau</p>
      </div>

      <div className="table-card">
        {stations.length === 0 ? (
          <p className="empty-state">Aucune station enregistrée</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Emplacement</th>
                <th>Version</th>
                <th>Statut</th>
                <th>Dernier heartbeat</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stations.map(station => (
                <tr key={station.id}>
                  <td className="font-medium">{station.name}</td>
                  <td><MapPin size={14} className="inline-icon" /> {station.location || '-'}</td>
                  <td><code>{station.version}</code></td>
                  <td>
                    <span className={`status-badge status-${station.status}`}>
                      {station.status}
                    </span>
                  </td>
                  <td>{station.last_heartbeat ? new Date(station.last_heartbeat).toLocaleString('fr-FR') : '-'}</td>
                  <td>
                    <button
                      className="btn-icon btn-warning"
                      onClick={() => handleDisconnect(station.station_id)}
                      title="Déconnecter (mode autonome)"
                      style={{ marginRight: '8px' }}
                    >
                      <Unplug size={16} />
                    </button>
                    <button
                      className="btn-icon btn-danger"
                      onClick={() => handleDelete(station.station_id)}
                      title="Supprimer définitivement"
                    >
                      <Trash2 size={16} />
                    </button>
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

export default StationsPage;
