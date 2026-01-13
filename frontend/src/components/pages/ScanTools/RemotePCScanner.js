import API_URL from '../../../config';
import React, { useState, useEffect } from 'react';
import './RemotePCScanner.css';
import { Card, Button, Loading } from '../../design-system';
import { Monitor, Play, PlayCircle, CheckCircle } from 'lucide-react';
import EDRAgentDownload from './EDRAgentDownload';

const RemotePCScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [agents, setAgents] = useState([]);
  const [scanResults, setScanResults] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAgentDownload, setShowAgentDownload] = useState(true);

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAgents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/edr/agents`);
      const data = await response.json();
      if (data.success) {
        setAgents(data.agents);
      }
      setLoading(false);
    } catch (err) {
      console.error('Erreur chargement agents:', err);
      setError('Impossible de charger la liste des agents EDR');
      setLoading(false);
    }
  };

  const scanAgent = async (agentId) => {
    setScanResults({ ...scanResults, [agentId]: { scanning: true } });
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/edr/scan/${agentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        setScanResults({
          ...scanResults,
          [agentId]: { scanning: false, success: true, data: data.result }
        });
      } else {
        setScanResults({
          ...scanResults,
          [agentId]: { scanning: false, success: false, error: data.error }
        });
      }
    } catch (err) {
      setScanResults({
        ...scanResults,
        [agentId]: { scanning: false, success: false, error: 'Erreur de connexion' }
      });
    }
  };

  const scanAllAgents = async () => {
    setScanning(true);
    for (const agent of agents) {
      await scanAgent(agent.agent_id);
    }
    setScanning(false);
  };

  if (loading) {
    return (
      <Card icon={Monitor} title="Scanner les PC via agents EDR">
        <Loading text="Chargement de la liste des agents..." />
      </Card>
    );
  }

  // Si aucun agent ET affichage download activé
  if (showAgentDownload && agents.length === 0) {
    return <EDRAgentDownload onAgentInstalled={() => setShowAgentDownload(false)} />;
  }

  return (
    <Card icon={Monitor} title="Scanner les PC via agents EDR">
      <div className="remote-scanner">
        <div className="scanner-header">
          <p className="scanner-info">
            Scannez les machines équipées d'agents EDR sans avoir besoin de login/mot de passe.
          </p>
          <Button
            icon={PlayCircle}
            onClick={scanAllAgents}
            disabled={scanning || agents.length === 0}
          >
            Scanner tous les agents ({agents.length})
          </Button>
        </div>

        {error && (
          <div className="scan-error">
            <p>{error}</p>
          </div>
        )}

        {agents.length === 0 ? (
          <div className="no-agents">
            <Monitor size={48} />
            <p>Aucun agent EDR connecté</p>
            <small>Installez des agents EDR sur vos machines pour pouvoir les scanner</small>
          </div>
        ) : (
          <div className="agents-list">
            <table className="agents-table">
              <thead>
                <tr>
                  <th>Machine</th>
                  <th>IP</th>
                  <th>OS</th>
                  <th>Statut</th>
                  <th>Dernier contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => {
                  const scanResult = scanResults[agent.agent_id];
                  const isScanning = scanResult?.scanning;
                  const lastSeen = new Date(agent.last_seen);
                  const isOnline = (Date.now() - lastSeen) < 60000; // 1 minute

                  return (
                    <tr key={agent.agent_id}>
                      <td>
                        <strong>{agent.hostname}</strong>
                      </td>
                      <td>{agent.ip}</td>
                      <td>{agent.os || 'Unknown'}</td>
                      <td>
                        <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
                          {isOnline ? 'En ligne' : 'Hors ligne'}
                        </span>
                      </td>
                      <td>{lastSeen.toLocaleString()}</td>
                      <td>
                        <Button
                          size="small"
                          icon={isScanning ? Loading : Play}
                          onClick={() => scanAgent(agent.agent_id)}
                          disabled={isScanning || !isOnline}
                        >
                          {isScanning ? 'Scan...' : 'Scanner'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {Object.keys(scanResults).length > 0 && (
              <div className="scan-results">
                <h3>Résultats des scans</h3>
                {Object.entries(scanResults).map(([agentId, result]) => {
                  const agent = agents.find(a => a.agent_id === agentId);
                  if (!result.success || result.scanning) return null;

                  return (
                    <div key={agentId} className="scan-result">
                      <div className="result-header">
                        <CheckCircle size={20} style={{ color: '#4caf50' }} />
                        <strong>{agent?.hostname}</strong>
                      </div>
                      <div className="result-details">
                        <p>Scan terminé avec succès</p>
                        {result.data && (
                          <pre>{JSON.stringify(result.data, null, 2)}</pre>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default RemotePCScanner;
