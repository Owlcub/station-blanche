import React from 'react';
import './StatusIndicator.css';

const StatusIndicator = ({ status = 'unknown', label, size = 'md', showLabel = true }) => {
  const statusMap = {
    active: { color: 'success', text: 'Actif' },
    running: { color: 'success', text: 'En cours' },
    stopped: { color: 'danger', text: 'Arrêté' },
    inactive: { color: 'danger', text: 'Inactif' },
    warning: { color: 'warning', text: 'Attention' },
    pending: { color: 'warning', text: 'En attente' },
    unknown: { color: 'default', text: 'Inconnu' }
  };

  const statusInfo = statusMap[status] || statusMap.unknown;
  const displayLabel = label || statusInfo.text;

  return (
    <div className={`status-indicator status-${size}`}>
      <span className={`status-dot status-dot-${statusInfo.color}`}></span>
      {showLabel && <span className="status-label">{displayLabel}</span>}
    </div>
  );
};

export default StatusIndicator;
