import React, { useState } from 'react';
import './EDRAgentDownload.css';
import { Download, Monitor, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, Button } from '../../design-system';

const EDRAgentDownload = ({ onAgentInstalled }) => {
  const [selectedOS, setSelectedOS] = useState('windows');

  const agents = {
    windows: {
      name: 'Agent EDR Windows',
      file: 'station-blanche-edr-agent-windows.exe',
      size: '~15 MB',
      requirements: 'Windows 10/11, Windows Server 2016+',
      icon: '🪟'
    },
    linux: {
      name: 'Agent EDR Linux',
      file: 'station-blanche-edr-agent-linux.sh',
      size: '~8 MB',
      requirements: 'Ubuntu 20.04+, Debian 11+, RHEL 8+',
      icon: '🐧'
    },
    macos: {
      name: 'Agent EDR macOS',
      file: 'station-blanche-edr-agent-macos.pkg',
      size: '~12 MB',
      requirements: 'macOS 11 (Big Sur) ou supérieur',
      icon: '🍎'
    }
  };

  const handleDownload = () => {
    const agent = agents[selectedOS];
    // Déclencher le téléchargement
    window.open(`/api/edr/download/${agent.file}`, '_blank');
  };

  const handleManualInstall = () => {
    onAgentInstalled();
  };

  return (
    <div className="edr-agent-download">
      <Card icon={Shield} title="Agent EDR - Scan de PC Réseau">
        <div className="edr-info">
          <div className="edr-alert">
            <AlertTriangle size={24} color="#f59e0b" />
            <div>
              <h3>Installation de l'agent EDR requise</h3>
              <p>
                Pour scanner un PC sur le réseau, vous devez d'abord installer l'agent EDR
                sur le PC cible. L'agent permet d'effectuer une analyse approfondie du système,
                de la mémoire et des processus actifs.
              </p>
            </div>
          </div>

          <div className="edr-features">
            <h3>✨ Fonctionnalités de l'agent EDR</h3>
            <ul>
              <li><CheckCircle size={18} color="#10b981" /> Scan en temps réel des processus et services</li>
              <li><CheckCircle size={18} color="#10b981" /> Analyse de la mémoire RAM (détection de malware in-memory)</li>
              <li><CheckCircle size={18} color="#10b981" /> Vérification des démarrages automatiques et tâches planifiées</li>
              <li><CheckCircle size={18} color="#10b981" /> Détection des rootkits et drivers malveillants</li>
              <li><CheckCircle size={18} color="#10b981" /> Scan antivirus avec ClamAV et signatures YARA</li>
              <li><CheckCircle size={18} color="#10b981" /> Rapport détaillé avec IOCs et recommandations</li>
            </ul>
          </div>

          <div className="os-selector">
            <h3>Sélectionnez le système d'exploitation du PC à scanner :</h3>
            <div className="os-buttons">
              {Object.entries(agents).map(([os, agent]) => (
                <button
                  key={os}
                  className={`os-btn ${selectedOS === os ? 'active' : ''}`}
                  onClick={() => setSelectedOS(os)}
                >
                  <span className="os-icon">{agent.icon}</span>
                  <span className="os-name">{agent.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="agent-details">
            <h4>📋 Détails de l'agent</h4>
            <div className="detail-row">
              <span className="detail-label">Fichier :</span>
              <span className="detail-value"><code>{agents[selectedOS].file}</code></span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Taille :</span>
              <span className="detail-value">{agents[selectedOS].size}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Prérequis :</span>
              <span className="detail-value">{agents[selectedOS].requirements}</span>
            </div>
          </div>

          <div className="installation-steps">
            <h3>📖 Instructions d'installation</h3>
            <ol>
              <li>
                <strong>Télécharger l'agent</strong> en cliquant sur le bouton ci-dessous
              </li>
              <li>
                <strong>Transférer l'agent</strong> sur le PC à scanner (clé USB, réseau, email...)
              </li>
              <li>
                <strong>Exécuter l'agent</strong> en tant qu'administrateur sur le PC cible
              </li>
              <li>
                <strong>Saisir l'adresse IP</strong> de cette station blanche quand demandé
              </li>
              <li>
                <strong>Attendre la connexion</strong> - L'agent se connectera automatiquement
              </li>
              <li>
                <strong>Lancer le scan</strong> depuis l'interface de la station blanche
              </li>
            </ol>
          </div>

          <div className="download-actions">
            <Button
              icon={Download}
              onClick={handleDownload}
              size="lg"
              style={{ marginBottom: '1rem' }}
            >
              Télécharger l'agent {agents[selectedOS].icon}
            </Button>

            <button className="manual-btn" onClick={handleManualInstall}>
              <Monitor size={20} />
              J'ai déjà installé l'agent - Continuer vers le scan
            </button>
          </div>

          <div className="edr-note">
            <p>
              <strong>Note :</strong> L'agent EDR est autonome et ne nécessite aucune connexion Internet.
              Toutes les analyses sont effectuées localement et les résultats sont envoyés uniquement
              à cette station blanche via le réseau local.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EDRAgentDownload;
