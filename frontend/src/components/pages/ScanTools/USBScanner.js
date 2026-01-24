import API_URL from '../../../config';
import React, { useState, useEffect } from 'react';
import './USBScanner.css';
import { Card, Button, Loading, Badge } from '../../design-system';
import { Usb, Play, Trash2, Unplug, AlertTriangle, Eraser } from 'lucide-react';

const USBScanner = () => {
  const [usbDevices, setUsbDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    detectUSB();
    const interval = setInterval(detectUSB, 3000);
    return () => clearInterval(interval);
  }, []);

  const detectUSB = async () => {
    try {
      const response = await fetch(`${API_URL}/api/usb/connected`);
      const data = await response.json();

      if (data.success && data.devices) {
        setUsbDevices(data.devices);
      }
    } catch (error) {
      console.error('Erreur détection USB:', error);
    }
  };

  const startScan = async (device) => {
    setScanning(true);
    setSelectedDevice(device);
    setScanResult(null);

    try {
      const response = await fetch(`${API_URL}/api/usb/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: device.device })
      });

      const data = await response.json();

      if (data.success) {
        // Normaliser la structure: scan_results -> infected_files et suspicious_files
        setScanResult({
          ...data,
          infected_files: data.scan_results?.filter(r => r.detection === 'ClamAV') || [],
          suspicious_files: data.scan_results?.filter(r => r.detection !== 'ClamAV') || [],
          all_threats: data.scan_results || []
        });
      }
    } catch (error) {
      console.error('Erreur scan USB:', error);
    } finally {
      setScanning(false);
    }
  };

  const handleQuarantine = async () => {
    if (!selectedDevice || !scanResult || !scanResult.infected_files) return;

    setActionInProgress(true);
    try {
      const response = await fetch(`${API_URL}/api/usb/quarantine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device: selectedDevice.device,
          files: scanResult.infected_files
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`${data.message || 'Fichiers mis en quarantaine avec succès'}\n\nVous pouvez maintenant éjecter la clé en toute sécurité.`);
        // Mettre à jour l'affichage : retirer les fichiers quarantainés
        setScanResult({
          ...scanResult,
          infected_files: [],
          all_threats: scanResult.suspicious_files || []
        });
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur quarantaine:', error);
      alert('Erreur lors de la mise en quarantaine');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleEject = async () => {
    if (!selectedDevice) return;

    setActionInProgress(true);
    try {
      const response = await fetch(`${API_URL}/api/usb/safe-eject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: selectedDevice.device })
      });

      const data = await response.json();
      if (data.success) {
        alert('Clé USB éjectée en toute sécurité');
        setScanResult(null);
        setSelectedDevice(null);
        detectUSB();
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur éjection:', error);
      alert('Erreur lors de l\'éjection');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCleanTrash = async () => {
    if (!selectedDevice) return;

    if (!window.confirm('Nettoyer la corbeille et les fichiers système cachés (.Trashes, .Spotlight, etc.) ?')) {
      return;
    }

    setActionInProgress(true);
    try {
      const response = await fetch(`${API_URL}/api/usb/clean-trash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: selectedDevice.device })
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message || 'Corbeille nettoyée avec succès');
        // Pas besoin de re-scanner après nettoyage de corbeille
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur nettoyage corbeille:', error);
      alert('Erreur lors du nettoyage de la corbeille');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleFormat = async () => {
    if (!selectedDevice) return;

    if (!window.confirm('ATTENTION: Le formatage effacera TOUTES les données. Continuer?')) {
      return;
    }

    setActionInProgress(true);
    try {
      const response = await fetch(`${API_URL}/api/usb/format`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: selectedDevice.device })
      });

      const data = await response.json();
      if (data.success) {
        alert('Clé USB formatée avec succès');
        setScanResult(null);
        setSelectedDevice(null);
        detectUSB();
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur formatage:', error);
      alert('Erreur lors du formatage');
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <Card icon={Usb} title="Scanner une clé USB">
      <div className="usb-scanner">
        {usbDevices.length === 0 ? (
          <div className="usb-empty">
            <Usb size={48} />
            <p>Aucune clé USB détectée</p>
            <span>Insérez une clé USB pour la scanner</span>
          </div>
        ) : (
          <>
            <div className="usb-devices">
              <h3>Clés USB détectées</h3>
              <div className="devices-list">
                {usbDevices.map((device, index) => (
                  <div key={index} className="usb-device-card">
                    <div className="device-info">
                      <Usb size={24} className="device-icon" />
                      <div className="device-details">
                        <span className="device-name">{device.model || device.name || 'Clé USB'}</span>
                        <span className="device-path">{device.device}</span>
                        {device.size && (
                          <span className="device-size">{device.size}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      icon={Play}
                      size="sm"
                      onClick={() => startScan(device)}
                      disabled={scanning}
                    >
                      Scanner
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {scanning && (
              <div className="scan-loading">
                <Loading text="Scan antivirus en cours..." />
              </div>
            )}

            {scanResult && (
              <div className="scan-result">
                <div className="result-header">
                  <h3>Résultats du scan</h3>
                  <Badge
                    variant={scanResult.infected_files?.length > 0 ? 'danger' : 'success'}
                  >
                    {scanResult.infected_files?.length > 0
                      ? `${scanResult.infected_files.length} menace(s)`
                      : 'Aucune menace'}
                  </Badge>
                </div>

                {scanResult.infected_files?.length > 0 && (
                  <>
                    <div className="infected-files">
                      <div className="warning-banner">
                        <AlertTriangle size={20} />
                        <span>Fichiers infectés détectés</span>
                      </div>
                      <ul className="files-list">
                        {scanResult.infected_files.map((file, index) => (
                          <li key={index} className="infected-file">
                            <span className="file-name">{file.file || file.path}</span>
                            <Badge variant="danger" size="sm">{file.threat || file.virus}</Badge>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="usb-actions">
                      <h4>Actions disponibles</h4>
                      <div className="actions-grid">
                        <Button
                          variant="warning"
                          icon={AlertTriangle}
                          onClick={handleQuarantine}
                          disabled={actionInProgress}
                          loading={actionInProgress}
                        >
                          Mettre en quarantaine
                        </Button>
                        <Button
                          variant="secondary"
                          icon={Eraser}
                          onClick={handleCleanTrash}
                          disabled={actionInProgress}
                          loading={actionInProgress}
                        >
                          Nettoyer corbeille
                        </Button>
                        <Button
                          variant="danger"
                          icon={Trash2}
                          onClick={handleFormat}
                          disabled={actionInProgress}
                          loading={actionInProgress}
                        >
                          Formater la clé
                        </Button>
                        <Button
                          variant="ghost"
                          icon={Unplug}
                          onClick={handleEject}
                          disabled={actionInProgress}
                          loading={actionInProgress}
                        >
                          Éjecter la clé
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {(!scanResult.infected_files || scanResult.infected_files.length === 0) && (
                  <div className="usb-actions">
                    <h4>Actions disponibles</h4>
                    <div className="actions-grid">
                      <Button
                        variant="secondary"
                        icon={Eraser}
                        onClick={handleCleanTrash}
                        disabled={actionInProgress}
                        loading={actionInProgress}
                      >
                        Nettoyer corbeille
                      </Button>
                      <Button
                        variant="ghost"
                        icon={Unplug}
                        onClick={handleEject}
                        disabled={actionInProgress}
                        loading={actionInProgress}
                      >
                        Éjecter la clé
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

export default USBScanner;
