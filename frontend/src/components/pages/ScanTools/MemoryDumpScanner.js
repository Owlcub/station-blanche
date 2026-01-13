import React, { useState } from 'react';
import './FileScanner.css';
import { Button, Loading } from '../../design-system';
import { Cpu, Upload, Play, CheckCircle, AlertTriangle, Terminal } from 'lucide-react';
import API_URL from '../../../config';

const MemoryDumpScanner = () => {
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setScanResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/pc/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setUploadedFile(data);
      } else {
        setError(data.error || 'Erreur lors de l\'upload');
      }
    } catch (err) {
      setError('Erreur de connexion: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const startScan = async () => {
    if (!uploadedFile) return;

    setScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const response = await fetch(`${API_URL}/api/pc/scan/memory-dump`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: uploadedFile.file_path
        })
      });

      const data = await response.json();

      if (data.success) {
        setScanResult(data);
      } else {
        setError(data.error || 'Erreur lors du scan');
      }
    } catch (err) {
      setError('Erreur de connexion: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="file-scanner">
      <div className="scanner-header">
        <Cpu size={32} color="#10b981" />
        <div>
          <h3>Scan de Memory Dump (RAM)</h3>
          <p>Analysez des dumps mémoire (.mem, .raw, .dmp) avec Volatility 3</p>
        </div>
      </div>

      <div className="upload-section">
        <div className="upload-box">
          <Upload size={48} />
          <p>Choisissez un dump mémoire à analyser</p>
          <label className="upload-btn">
            <input
              type="file"
              accept=".mem,.raw,.dmp,.dump"
              onChange={handleFileSelect}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <Button icon={Upload} disabled={uploading}>
              {uploading ? 'Upload en cours...' : 'Sélectionner un fichier'}
            </Button>
          </label>
        </div>

        {uploading && <Loading text="Upload du fichier en cours..." />}

        {uploadedFile && !scanning && !scanResult && (
          <div className="file-info">
            <CheckCircle size={24} color="#10b981" />
            <div>
              <strong>{uploadedFile.file_name}</strong>
              <span>{formatBytes(uploadedFile.file_size)}</span>
            </div>
            <Button icon={Play} onClick={startScan}>
              Lancer l'analyse Volatility
            </Button>
          </div>
        )}

        {scanning && (
          <div className="scanning-status">
            <Loading text="Analyse en cours..." />
            <p>Détection du profil OS, extraction des processus et scan antivirus...</p>
            <p className="warning">⏱️ L'analyse Volatility peut prendre 5 à 15 minutes</p>
          </div>
        )}

        {error && (
          <div className="scan-error">
            <AlertTriangle size={24} />
            <p>{error}</p>
            {error.includes('Volatility 3') && (
              <div className="install-note">
                <p><strong>Installation Volatility 3 :</strong></p>
                <code>pip3 install volatility3</code>
              </div>
            )}
          </div>
        )}

        {scanResult && (
          <div className="scan-result">
            <div className="result-header">
              <CheckCircle size={32} color={scanResult.threats_found > 0 ? '#f59e0b' : '#10b981'} />
              <h3>Analyse terminée</h3>
            </div>

            <div className="result-stats">
              <div className="stat-item">
                <span className="stat-label">Profil OS:</span>
                <span className="stat-value">{scanResult.os_profile}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Processus détectés:</span>
                <span className="stat-value">{scanResult.total_processes}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Processus suspects:</span>
                <span className={`stat-value ${scanResult.suspicious_processes.length > 0 ? 'danger' : 'success'}`}>
                  {scanResult.suspicious_processes.length}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Menaces trouvées:</span>
                <span className={`stat-value ${scanResult.threats_found > 0 ? 'danger' : 'success'}`}>
                  {scanResult.threats_found}
                </span>
              </div>
            </div>

            {scanResult.suspicious_processes && scanResult.suspicious_processes.length > 0 && (
              <div className="threats-list">
                <h4><AlertTriangle size={20} /> Processus suspects détectés</h4>
                <div className="process-list">
                  {scanResult.suspicious_processes.map((process, idx) => (
                    <div key={idx} className="process-item">
                      <Terminal size={16} />
                      <code>{process}</code>
                    </div>
                  ))}
                </div>
                <p className="warning-note">
                  ⚠️ Ces processus sont connus pour être utilisés par des attaquants
                  (mimikatz, psexec, netcat, etc.)
                </p>
              </div>
            )}

            {scanResult.threats && scanResult.threats.length > 0 && (
              <div className="threats-list">
                <h4><AlertTriangle size={20} /> Malwares en mémoire</h4>
                {scanResult.threats.map((threat, idx) => (
                  <div key={idx} className="threat-detail">
                    <strong>{threat.type}</strong>
                    <p>{threat.description}</p>
                  </div>
                ))}
              </div>
            )}

            {scanResult.threats_found === 0 && (
              <div className="clean-result">
                <CheckCircle size={48} color="#10b981" />
                <h4>✨ Aucune menace détectée</h4>
                <p>Le dump mémoire ne contient pas de processus malveillants connus</p>
              </div>
            )}

            <Button onClick={() => { setUploadedFile(null); setScanResult(null); }}>
              Analyser un autre dump
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryDumpScanner;
