import API_URL from '../../../config';
import React, { useState, useEffect } from 'react';
import './USBTransfer.css';
import { Card, Button, Loading, Badge } from '../../design-system';
import { ArrowLeftRight, Usb, Play, CheckCircle, AlertTriangle, History } from 'lucide-react';

const USBTransfer = () => {
  const [usbDevices, setUsbDevices] = useState([]);
  const [sourceDevice, setSourceDevice] = useState(null);
  const [destDevice, setDestDevice] = useState(null);
  const [transferring, setTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState(null);
  const [transferHistory, setTransferHistory] = useState([]);
  const [scanBeforeTransfer, setScanBeforeTransfer] = useState(true);

  useEffect(() => {
    detectUSB();
    loadHistory();
    const interval = setInterval(detectUSB, 3000);
    return () => clearInterval(interval);
  }, []);

  const detectUSB = async () => {
    try {
      const response = await fetch(`${API_URL}/api/usb/transfer/list`);
      const data = await response.json();

      if (data.success && data.devices) {
        setUsbDevices(data.devices);
      }
    } catch (error) {
      console.error('Erreur détection USB:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/usb/transfer/history`);
      const data = await response.json();

      if (data.success) {
        setTransferHistory(data.transfers || []);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  const startTransfer = async () => {
    if (!sourceDevice || !destDevice) {
      alert('Veuillez sélectionner une clé source et une clé destination');
      return;
    }

    if (sourceDevice.device === destDevice.device) {
      alert('Les clés source et destination doivent être différentes');
      return;
    }

    if (!window.confirm(`Transférer les données de ${sourceDevice.name} vers ${destDevice.name} ?\n\nATTENTION: Les données existantes sur ${destDevice.name} seront conservées.`)) {
      return;
    }

    setTransferring(true);
    setTransferResult(null);

    try {
      const response = await fetch(`${API_URL}/api/usb/transfer/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: sourceDevice.device,
          destination: destDevice.device,
          options: {
            scan_before_transfer: scanBeforeTransfer
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
        loadHistory(); // Recharger l'historique
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
    }
  };

  return (
    <Card icon={ArrowLeftRight} title="Transfert sécurisé entre 2 USB">
      <div className="usb-transfer">
        {usbDevices.length < 2 ? (
          <div className="usb-empty">
            <Usb size={48} />
            <p>Insérez au moins 2 clés USB pour effectuer un transfert</p>
            <span>{usbDevices.length} clé(s) détectée(s)</span>
          </div>
        ) : (
          <>
            <div className="transfer-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={scanBeforeTransfer}
                  onChange={(e) => setScanBeforeTransfer(e.target.checked)}
                />
                Scanner la source avant transfert (ClamAV)
              </label>
            </div>

            <div className="device-selection">
              <div className="device-column">
                <h3>🔹 Clé SOURCE</h3>
                <div className="devices-list">
                  {usbDevices.map((device, index) => (
                    <div
                      key={index}
                      className={`device-card ${sourceDevice?.device === device.device ? 'selected' : ''}`}
                      onClick={() => setSourceDevice(device)}
                    >
                      <Usb size={24} />
                      <div className="device-info">
                        <span className="device-name">{device.name}</span>
                        <span className="device-size">{device.size}</span>
                      </div>
                      {sourceDevice?.device === device.device && (
                        <CheckCircle size={20} color="#4caf50" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="transfer-arrow">
                <ArrowLeftRight size={48} />
              </div>

              <div className="device-column">
                <h3>🔸 Clé DESTINATION</h3>
                <div className="devices-list">
                  {usbDevices.map((device, index) => (
                    <div
                      key={index}
                      className={`device-card ${destDevice?.device === device.device ? 'selected' : ''}`}
                      onClick={() => setDestDevice(device)}
                    >
                      <Usb size={24} />
                      <div className="device-info">
                        <span className="device-name">{device.name}</span>
                        <span className="device-size">{device.size}</span>
                      </div>
                      {destDevice?.device === device.device && (
                        <CheckCircle size={20} color="#4caf50" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="transfer-action">
              <Button
                icon={Play}
                onClick={startTransfer}
                disabled={!sourceDevice || !destDevice || transferring}
                loading={transferring}
                size="lg"
              >
                {transferring ? 'Transfert en cours...' : 'Démarrer le transfert'}
              </Button>
            </div>

            {transferring && (
              <div className="transfer-loading">
                <Loading text="Transfert en cours..." />
                {scanBeforeTransfer && <p>Scan antivirus de la source...</p>}
              </div>
            )}

            {transferResult && (
              <div className={`transfer-result ${transferResult.success ? 'success' : 'error'}`}>
                {transferResult.success ? (
                  <>
                    <CheckCircle size={32} />
                    <h3>Transfert réussi !</h3>
                    <p>{transferResult.files_transferred} fichiers transférés</p>
                    {transferResult.integrity_ok && (
                      <Badge variant="success">Intégrité vérifiée ✓</Badge>
                    )}
                  </>
                ) : (
                  <>
                    <AlertTriangle size={32} />
                    <h3>Erreur de transfert</h3>
                    <p>{transferResult.error}</p>
                    {transferResult.scan_result && (
                      <div className="scan-details">
                        <h4>Résultat du scan:</h4>
                        <pre>{transferResult.scan_result}</pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {transferHistory.length > 0 && (
              <div className="transfer-history">
                <h3>
                  <History size={20} />
                  Historique des transferts
                </h3>
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Source</th>
                      <th>Destination</th>
                      <th>Fichiers</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferHistory.slice(0, 10).map((transfer, index) => (
                      <tr key={index}>
                        <td>{new Date(transfer.timestamp).toLocaleString()}</td>
                        <td>{transfer.source}</td>
                        <td>{transfer.destination}</td>
                        <td>{transfer.files_transferred}</td>
                        <td>
                          <Badge variant={transfer.integrity_ok ? 'success' : 'warning'}>
                            {transfer.integrity_ok ? 'OK' : 'Vérifier'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

export default USBTransfer;
