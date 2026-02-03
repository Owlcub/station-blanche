import API_URL from '../../../config';
import React, { useState, useEffect } from 'react';
import './USBTransfer.css';
import { Card, Button, Loading, Badge } from '../../design-system';
import { ArrowLeftRight, Usb, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const STEPS = {
  INSERT_SOURCE: 'insert_source',
  SCAN_SOURCE: 'scan_source',
  INSERT_DEST: 'insert_dest',
  SCAN_DEST: 'scan_dest',
  SELECT_FILES: 'select_files',
  TRANSFER: 'transfer',
  COMPLETE: 'complete'
};

const USBTransferGuided = () => {
  const [currentStep, setCurrentStep] = useState(STEPS.INSERT_SOURCE);
  const [usbDevices, setUsbDevices] = useState([]);
  const [sourceDevice, setSourceDevice] = useState(null);
  const [destDevice, setDestDevice] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [transferring, setTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState(null);
  const [transferResult, setTransferResult] = useState(null);

  // Sélection de fichiers
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [browserItems, setBrowserItems] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedPaths, setSelectedPaths] = useState([]);
  const [loadingBrowser, setLoadingBrowser] = useState(false);

  // Certification
  const [certifying, setCertifying] = useState(false);
  const [certificationResult, setCertificationResult] = useState(null);

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

  const scanDevice = async (device) => {
    setScanning(true);
    setScanResult(null);

    try {
      // Utiliser l'endpoint dédié au transfert (workflow indépendant)
      const response = await fetch(`${API_URL}/api/usb/scan-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: device.device })
      });

      const data = await response.json();

      if (data.success) {
        setScanResult({
          ...data,
          infected_files: data.scan_results?.filter(r => r.detection === 'ClamAV') || [],
          suspicious_files: data.scan_results?.filter(r => r.detection !== 'ClamAV') || [],
          all_threats: data.scan_results || []
        });
        return data;
      }
    } catch (error) {
      console.error('Erreur scan USB:', error);
      return { success: false, error: error.message };
    } finally {
      setScanning(false);
    }
  };

  const handleSourceSelected = async (device) => {
    setSourceDevice(device);
    setCurrentStep(STEPS.SCAN_SOURCE);
    const result = await scanDevice(device);

    console.log('[USBTransferGuided] Scan source terminé:', result);

    if (result && result.success && (!result.scan_results || result.scan_results.length === 0)) {
      console.log('[USBTransferGuided] Aucune menace, transition vers INSERT_DEST dans 1.5s');
      // Pas de menaces, continuer
      setTimeout(() => {
        setScanResult(null); // Réinitialiser pour la prochaine étape
        setCurrentStep(STEPS.INSERT_DEST);
      }, 1500);
    } else {
      console.log('[USBTransferGuided] Menaces détectées ou erreur, reste sur SCAN_SOURCE');
    }
  };

  const handleDestSelected = async (device) => {
    setDestDevice(device);
    setCurrentStep(STEPS.SCAN_DEST);
    const result = await scanDevice(device);

    if (result && result.success && (!result.scan_results || result.scan_results.length === 0)) {
      // Pas de menaces, continuer vers sélection fichiers
      setTimeout(() => {
        setScanResult(null); // Réinitialiser pour la prochaine étape
        setCurrentStep(STEPS.SELECT_FILES);
      }, 1500);
    }
  };

  const browseSource = async (path = '') => {
    if (!sourceDevice) {
      console.error('[USBTransferGuided] browseSource: pas de sourceDevice');
      return;
    }

    console.log('[USBTransferGuided] browseSource:', { device: sourceDevice.device, path });
    setLoadingBrowser(true);
    try {
      const response = await fetch(`${API_URL}/api/usb/transfer/browse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device: sourceDevice.device,
          path
        })
      });

      const data = await response.json();
      console.log('[USBTransferGuided] browseSource response:', data);

      if (data.success) {
        setBrowserItems(data.items);
        setCurrentPath(data.path);
        setShowFileBrowser(true);
        console.log('[USBTransferGuided] Items chargés:', data.items.length);
      } else {
        console.error('[USBTransferGuided] Browse failed:', data.error);
      }
    } catch (error) {
      console.error('[USBTransferGuided] Erreur navigation:', error);
    } finally {
      setLoadingBrowser(false);
    }
  };

  const toggleSelectItem = (item) => {
    setSelectedPaths(prev => {
      const exists = prev.find(p => p === item.path);
      if (exists) {
        return prev.filter(p => p !== item.path);
      } else {
        return [...prev, item.path];
      }
    });
  };

  const startTransfer = async () => {
    if (!sourceDevice || !destDevice) return;

    setCurrentStep(STEPS.TRANSFER);
    setTransferring(true);
    setTransferResult(null);
    setTransferProgress({ percent: 0, step: 'Initialisation...' });

    try {
      const response = await fetch(`${API_URL}/api/usb/transfer/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: sourceDevice.device,
          destination: destDevice.device,
          selectedPaths: selectedPaths,
          options: {
            scan_before_transfer: true
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setTransferResult({
          success: true,
          transfer_id: data.transfer_id,
          files_transferred: data.files_transferred,
          integrity_ok: data.integrity_ok
        });
        setCurrentStep(STEPS.COMPLETE);
      } else {
        setTransferResult({
          success: false,
          error: data.error,
          scan_result: data.scan_result
        });
      }
    } catch (error) {
      console.error('Erreur transfert:', error);
      setTransferResult({
        success: false,
        error: error.message
      });
    } finally {
      setTransferring(false);
      setTransferProgress(null);
    }
  };

  const ejectBothDevices = async () => {
    const ejectDevice = async (device) => {
      try {
        const response = await fetch(`${API_URL}/api/usb/safe-eject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device: device.device })
        });
        return await response.json();
      } catch (error) {
        console.error('Erreur éjection:', error);
        return { success: false, error: error.message };
      }
    };

    if (sourceDevice) await ejectDevice(sourceDevice);
    if (destDevice) await ejectDevice(destDevice);

    // Reset
    setCurrentStep(STEPS.INSERT_SOURCE);
    setSourceDevice(null);
    setDestDevice(null);
    setScanResult(null);
    setTransferResult(null);
    setSelectedPaths([]);
  };

  const restart = () => {
    setCurrentStep(STEPS.INSERT_SOURCE);
    setSourceDevice(null);
    setDestDevice(null);
    setScanResult(null);
    setTransferResult(null);
    setCertificationResult(null);
    setSelectedPaths([]);
  };

  const certifyUSB = async (device, scanData) => {
    setCertifying(true);
    setCertificationResult(null);

    try {
      const response = await fetch(`${API_URL}/api/certification/certify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          device: device.device,
          mount_point: scanData.mount_point,
          scan_results: {
            clamav_clean: scanData.clean,
            ransomware_detected: scanData.ransomware_analysis?.ransomware_detected || false,
            entropy_status: scanData.entropy_analysis?.status || 'normal',
            total_files: scanData.entropy_analysis?.total_scanned || 0,
            total_size_bytes: 0,
            threats_found: scanData.scan_results?.length || 0
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

  // Polling progression transfert
  useEffect(() => {
    if (!transferring) return;

    const pollProgress = async () => {
      try {
        const response = await fetch(`${API_URL}/api/usb/transfer/status/current`);
        const data = await response.json();
        if (data.percent !== undefined) {
          setTransferProgress(data);
        }
      } catch (error) {
        console.error('Erreur polling progression:', error);
      }
    };

    const interval = setInterval(pollProgress, 500);
    return () => clearInterval(interval);
  }, [transferring]);

  const renderStepIndicator = () => {
    const steps = [
      { id: STEPS.INSERT_SOURCE, label: '1. Source' },
      { id: STEPS.SCAN_SOURCE, label: '2. Scan' },
      { id: STEPS.INSERT_DEST, label: '3. Dest.' },
      { id: STEPS.SCAN_DEST, label: '4. Scan' },
      { id: STEPS.SELECT_FILES, label: '5. Fichiers' },
      { id: STEPS.TRANSFER, label: '6. Transfert' },
      { id: STEPS.COMPLETE, label: '7. Fin' }
    ];

    const currentIndex = steps.findIndex(s => s.id === currentStep);

    return (
      <div className="step-indicator">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`step ${index <= currentIndex ? 'active' : ''} ${index === currentIndex ? 'current' : ''}`}
          >
            <div className="step-number">{index + 1}</div>
            <div className="step-label">{step.label}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card icon={ArrowLeftRight} title="Transfert guidé USB → USB">
      <div className="usb-transfer-guided">
        {renderStepIndicator()}

        <div className="step-content">
          {/* ÉTAPE 1: Insérer source */}
          {currentStep === STEPS.INSERT_SOURCE && (
            <div className="step-view">
              <div className="instruction-banner">
                <Usb size={48} />
                <h2>Insérez la première clé USB (SOURCE)</h2>
                <p>Cette clé contient les fichiers à transférer</p>
              </div>

              {usbDevices.length === 0 ? (
                <div className="waiting-message">
                  <Loading text="En attente d'une clé USB..." />
                </div>
              ) : (
                <div className="devices-list">
                  {usbDevices.map((device, index) => (
                    <div
                      key={index}
                      className="device-card clickable"
                      onClick={() => handleSourceSelected(device)}
                    >
                      <Usb size={32} />
                      <div className="device-info">
                        <span className="device-name">{device.model || device.name || 'Clé USB'}</span>
                        <span className="device-path">{device.device}</span>
                        {device.size && <span className="device-size">{device.size}</span>}
                      </div>
                      <Button size="sm">Sélectionner</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 2: Scan source */}
          {currentStep === STEPS.SCAN_SOURCE && (
            <div className="step-view">
              <div className="instruction-banner">
                <AlertTriangle size={48} color="#f59e0b" />
                <h2>Scan de la clé SOURCE en cours...</h2>
                <p>{sourceDevice?.name || sourceDevice?.device}</p>
              </div>

              {scanning ? (
                <Loading text="Analyse antivirus en cours..." />
              ) : scanResult ? (
                <div className="scan-summary">
                  {scanResult.infected_files?.length > 0 ? (
                    <>
                      <XCircle size={64} color="#ef4444" />
                      <h3>⚠️ Menaces détectées!</h3>
                      <p>{scanResult.infected_files.length} fichier(s) infecté(s)</p>
                      <div className="action-buttons">
                        <Button variant="danger" onClick={restart}>
                          Annuler le transfert
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={64} color="#10b981" />
                      <h3>✓ Clé saine</h3>
                      <p>Aucune menace détectée</p>

                      {/* Bouton Certifier */}
                      <div className="certification-section" style={{marginTop: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px'}}>
                        {certificationResult ? (
                          certificationResult.success ? (
                            <div style={{color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                              <CheckCircle size={20} style={{marginRight: '8px'}} />
                              {certificationResult.message}
                            </div>
                          ) : (
                            <div style={{color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                              <XCircle size={20} style={{marginRight: '8px'}} />
                              Erreur: {certificationResult.error}
                            </div>
                          )
                        ) : (
                          <Button
                            onClick={() => certifyUSB(sourceDevice, scanResult)}
                            disabled={certifying}
                            variant="primary"
                          >
                            {certifying ? 'Certification...' : '🔒 Certifier cette clé USB'}
                          </Button>
                        )}
                        <p style={{fontSize: '12px', color: '#64748b', marginTop: '8px', textAlign: 'center'}}>
                          La certification permet d'autoriser cette clé sur les réseaux d'entreprise
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* ÉTAPE 3: Insérer destination */}
          {currentStep === STEPS.INSERT_DEST && (
            <div className="step-view">
              <div className="instruction-banner">
                <Usb size={48} />
                <h2>Insérez la deuxième clé USB (DESTINATION)</h2>
                <p>Les fichiers seront copiés sur cette clé</p>
              </div>

              {usbDevices.filter(d => d.device !== sourceDevice?.device).length === 0 ? (
                <div className="waiting-message">
                  <Loading text="En attente de la deuxième clé USB..." />
                </div>
              ) : (
                <div className="devices-list">
                  {usbDevices
                    .filter(d => d.device !== sourceDevice?.device)
                    .map((device, index) => (
                      <div
                        key={index}
                        className="device-card clickable"
                        onClick={() => handleDestSelected(device)}
                      >
                        <Usb size={32} />
                        <div className="device-info">
                          <span className="device-name">{device.model || device.name || 'Clé USB'}</span>
                          <span className="device-path">{device.device}</span>
                          {device.size && <span className="device-size">{device.size}</span>}
                        </div>
                        <Button size="sm">Sélectionner</Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 4: Scan destination */}
          {currentStep === STEPS.SCAN_DEST && (
            <div className="step-view">
              <div className="instruction-banner">
                <AlertTriangle size={48} color="#f59e0b" />
                <h2>Scan de la clé DESTINATION en cours...</h2>
                <p>{destDevice?.name || destDevice?.device}</p>
              </div>

              {scanning ? (
                <Loading text="Analyse antivirus en cours..." />
              ) : scanResult ? (
                <div className="scan-summary">
                  {scanResult.infected_files?.length > 0 ? (
                    <>
                      <XCircle size={64} color="#ef4444" />
                      <h3>⚠️ Menaces détectées!</h3>
                      <p>{scanResult.infected_files.length} fichier(s) infecté(s)</p>
                      <div className="action-buttons">
                        <Button variant="danger" onClick={restart}>
                          Annuler le transfert
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={64} color="#10b981" />
                      <h3>✓ Clé saine</h3>
                      <p>Aucune menace détectée</p>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* ÉTAPE 5: Sélection fichiers */}
          {currentStep === STEPS.SELECT_FILES && (
            <div className="step-view">
              <div className="instruction-banner">
                <ArrowLeftRight size={48} />
                <h2>Sélectionnez les fichiers à transférer</h2>
                <p>De {sourceDevice?.name} vers {destDevice?.name}</p>
              </div>

              <div className="transfer-options">
                <Button onClick={() => browseSource('')} disabled={loadingBrowser}>
                  📁 Parcourir la clé source
                </Button>
                <p className="selected-info">
                  {selectedPaths.length > 0
                    ? `${selectedPaths.length} élément(s) sélectionné(s)`
                    : 'Aucun fichier sélectionné (tout sera transféré)'}
                </p>
              </div>

              {showFileBrowser && (
                <div className="file-browser">
                  <div className="file-browser-header">
                    <h3>📂 {sourceDevice.name}</h3>
                    <button onClick={() => setShowFileBrowser(false)} className="close-btn">✕</button>
                  </div>
                  <div className="current-path">
                    <span>/{currentPath || 'racine'}</span>
                    {currentPath && (
                      <button onClick={() => {
                        const parentPath = currentPath.split('/').slice(0, -1).join('/');
                        browseSource(parentPath);
                      }}>⬆️ Dossier parent</button>
                    )}
                  </div>
                  {loadingBrowser ? (
                    <Loading text="Chargement..." />
                  ) : (
                    <div className="file-list">
                      {browserItems.map((item, idx) => (
                        <div key={idx} className="file-item">
                          <input
                            type="checkbox"
                            checked={selectedPaths.includes(item.path)}
                            onChange={() => toggleSelectItem(item)}
                          />
                          {item.type === 'directory' ? (
                            <span
                              className="file-name folder"
                              onClick={() => browseSource(item.path)}
                            >
                              📁 {item.name}
                            </span>
                          ) : (
                            <span className="file-name">
                              📄 {item.name}
                            </span>
                          )}
                          <span className="file-size">{item.size}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="action-buttons">
                <Button size="lg" onClick={startTransfer}>
                  {selectedPaths.length > 0
                    ? `Transférer ${selectedPaths.length} élément(s)`
                    : 'Transférer tout le contenu'}
                </Button>
              </div>
            </div>
          )}

          {/* ÉTAPE 6: Transfert en cours */}
          {currentStep === STEPS.TRANSFER && (
            <div className="step-view">
              <div className="instruction-banner">
                <ArrowLeftRight size={48} />
                <h2>Transfert en cours...</h2>
                <p>Ne retirez pas les clés USB</p>
              </div>

              {transferProgress && (
                <div className="progress-container">
                  <div className="progress-header">
                    <span className="progress-title">{transferProgress.step || 'Transfert...'}</span>
                    <span className="progress-percent">{transferProgress.percent || 0}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${transferProgress.percent || 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 7: Terminé */}
          {currentStep === STEPS.COMPLETE && (
            <div className="step-view">
              {transferResult?.success ? (
                <>
                  <div className="instruction-banner success">
                    <CheckCircle size={64} color="#10b981" />
                    <h2>✓ Transfert réussi!</h2>
                    <p>{transferResult.files_transferred} fichier(s) transféré(s)</p>
                    {transferResult.integrity_ok && (
                      <Badge variant="success">Intégrité vérifiée ✓</Badge>
                    )}
                  </div>

                  {transferResult.transferred_files && transferResult.transferred_files.length > 0 && (
                    <div className="transferred-files-list">
                      <h3>Fichiers copiés sur la clé de destination :</h3>
                      <ul>
                        {transferResult.transferred_files.map((file, idx) => (
                          <li key={idx}>✓ {file}</li>
                        ))}
                      </ul>
                      {transferResult.files_transferred > transferResult.transferred_files.length && (
                        <p className="more-files">
                          ... et {transferResult.files_transferred - transferResult.transferred_files.length} autre(s) fichier(s)
                        </p>
                      )}
                    </div>
                  )}

                  <div className="completion-message">
                    <h3>Vous pouvez maintenant retirer les clés USB</h3>
                    <p>Les périphériques vont être démontés en toute sécurité</p>
                  </div>

                  <div className="action-buttons">
                    <Button size="lg" onClick={ejectBothDevices}>
                      Démonter et retirer les clés
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="instruction-banner error">
                    <XCircle size={64} color="#ef4444" />
                    <h2>Erreur lors du transfert</h2>
                    <p>{transferResult?.error || 'Une erreur est survenue'}</p>
                  </div>

                  <div className="action-buttons">
                    <Button variant="danger" onClick={restart}>
                      Recommencer
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default USBTransferGuided;
