import API_URL from '../../../config';
import React, { useState, useEffect } from 'react';
import './USBScanner.css';
import { Card, Button, Loading, Badge } from '../../design-system';
import { Usb, Play, Trash2, Unplug, AlertTriangle, Eraser, Shield, CheckCircle, XCircle } from 'lucide-react';

const USBScanner = () => {
  const [usbDevices, setUsbDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Certification states
  const [certifying, setCertifying] = useState(false);
  const [certificationResult, setCertificationResult] = useState(null);
  const [certificationStatus, setCertificationStatus] = useState(null);
  const [showCertificationModal, setShowCertificationModal] = useState(false);

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
        const result = {
          ...data,
          infected_files: data.scan_results?.filter(r => r.detection === 'ClamAV') || [],
          suspicious_files: data.scan_results?.filter(r => r.detection !== 'ClamAV') || [],
          all_threats: data.scan_results || []
        };
        setScanResult(result);

        // Vérifier si la clé a déjà un certificat et proposer certification si besoin
        if (data.mount_point) {
          const certStatus = await checkCertification(data.mount_point);

          // Si scan propre, pas de menaces et pas déjà certifiée → Proposer certification
          if (result.clean && result.all_threats.length === 0 && !certStatus.certified) {
            setShowCertificationModal(true);
          }
        }
      }
    } catch (error) {
      console.error('Erreur scan USB:', error);
    } finally {
      setScanning(false);
    }
  };

  const checkCertification = async (mountPoint) => {
    try {
      const response = await fetch(`${API_URL}/api/certification/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mount_point: mountPoint })
      });

      const data = await response.json();
      const status = data.success && data.certified ? {
        certified: true,
        certificate: data.certificate,
        verification: data.verification
      } : {
        certified: false
      };

      setCertificationStatus(status);
      return status;
    } catch (error) {
      console.error('Erreur vérification certification:', error);
      const status = { certified: false };
      setCertificationStatus(status);
      return status;
    }
  };

  const certifyUSB = async () => {
    if (!selectedDevice || !scanResult) return;

    setCertifying(true);
    setCertificationResult(null);

    try {
      const response = await fetch(`${API_URL}/api/certification/certify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          device: selectedDevice.device,
          mount_point: scanResult.mount_point,
          scan_results: {
            clamav_clean: scanResult.clean,
            ransomware_detected: scanResult.ransomware_analysis?.ransomware_detected || false,
            entropy_status: scanResult.entropy_analysis?.status || 'normal',
            total_files: scanResult.entropy_analysis?.total_scanned || 0,
            total_size_bytes: 0,
            threats_found: scanResult.scan_results?.length || 0
          },
          options: {
            policy: 'standard',
            includeManifest: true
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setCertificationResult({
          success: true,
          message: 'Clé USB certifiée avec succès !',
          cert_path: data.cert_path
        });
        // Mettre à jour le statut
        setCertificationStatus({
          certified: true,
          certificate: data.certificate
        });
      } else {
        setCertificationResult({
          success: false,
          error: data.error
        });
      }
    } catch (error) {
      console.error('Erreur certification:', error);
      setCertificationResult({
        success: false,
        error: error.message
      });
    } finally {
      setCertifying(false);
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
                  <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                    <Badge
                      variant={scanResult.infected_files?.length > 0 ? 'danger' : 'success'}
                    >
                      {scanResult.infected_files?.length > 0
                        ? `${scanResult.infected_files.length} menace(s)`
                        : 'Aucune menace'}
                    </Badge>
                    {certificationStatus && (
                      <Badge
                        variant={certificationStatus.certified ? 'success' : 'warning'}
                      >
                        {certificationStatus.certified ? (
                          <>
                            <Shield size={14} style={{marginRight: '4px'}} />
                            Certifiée
                          </>
                        ) : (
                          <>
                            <Shield size={14} style={{marginRight: '4px'}} />
                            Non certifiée
                          </>
                        )}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Afficher info certificat si existant */}
                {certificationStatus?.certified && certificationStatus.verification && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    background: '#d1fae5',
                    borderRadius: '8px',
                    border: '1px solid #10b981'
                  }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', marginBottom: '4px'}}>
                      <CheckCircle size={16} />
                      <strong>Clé certifiée</strong>
                    </div>
                    <div style={{fontSize: '12px', color: '#047857'}}>
                      {certificationStatus.verification.expired ? (
                        <span style={{color: '#dc2626'}}>⚠️ Certificat expiré le {new Date(certificationStatus.certificate.expiration).toLocaleString()}</span>
                      ) : (
                        <span>Expire le {new Date(certificationStatus.certificate.expiration).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                )}

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
                  <>
                    {/* Section de certification */}
                    {!certificationStatus?.certified && (
                      <div style={{
                        marginTop: '16px',
                        padding: '16px',
                        background: '#f0f9ff',
                        borderRadius: '8px',
                        border: '1px solid #3b82f6'
                      }}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                          <Shield size={20} color="#3b82f6" />
                          <h4 style={{margin: 0, color: '#1e40af'}}>Certification USB</h4>
                        </div>

                        {certificationResult ? (
                          certificationResult.success ? (
                            <div style={{color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px'}}>
                              <CheckCircle size={18} />
                              <span>{certificationResult.message}</span>
                            </div>
                          ) : (
                            <div style={{color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px'}}>
                              <XCircle size={18} />
                              <span>Erreur: {certificationResult.error}</span>
                            </div>
                          )
                        ) : (
                          <>
                            <p style={{fontSize: '13px', color: '#1e40af', margin: '0 0 12px 0'}}>
                              Certifiez cette clé USB pour l'autoriser sur les réseaux d'entreprise protégés
                            </p>
                            <Button
                              variant="primary"
                              icon={Shield}
                              onClick={certifyUSB}
                              disabled={certifying || actionInProgress}
                              loading={certifying}
                            >
                              {certifying ? 'Certification...' : 'Certifier cette clé USB'}
                            </Button>
                          </>
                        )}
                      </div>
                    )}

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
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de certification automatique */}
      {showCertificationModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
              <Shield size={32} color="#3b82f6" />
              <h2 style={{margin: 0, color: '#1e40af'}}>Certifier cette clé USB ?</h2>
            </div>
            <p style={{fontSize: '15px', color: '#4b5563', marginBottom: '20px'}}>
              La clé est propre et saine. Voulez-vous la certifier pour l'autoriser sur les réseaux d'entreprise ?
            </p>
            <div style={{background: '#f0f9ff', padding: '12px', borderRadius: '6px', marginBottom: '20px'}}>
              <p style={{fontSize: '13px', color: '#1e40af', margin: 0}}>
                <strong>✓ Avantages :</strong>
              </p>
              <ul style={{fontSize: '13px', color: '#1e40af', marginTop: '8px', marginBottom: 0, paddingLeft: '20px'}}>
                <li>Clé autorisée sur les postes protégés par GPO</li>
                <li>Certificat valide 1 heure (configurable)</li>
                <li>Guide GPO copié automatiquement sur la clé</li>
              </ul>
            </div>
            <div style={{display: 'flex', gap: '12px'}}>
              <Button
                variant="primary"
                icon={Shield}
                onClick={() => {
                  setShowCertificationModal(false);
                  certifyUSB();
                }}
                disabled={certifying}
                loading={certifying}
                style={{flex: 1}}
              >
                Certifier maintenant
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowCertificationModal(false)}
                style={{flex: 1}}
              >
                Plus tard
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default USBScanner;
