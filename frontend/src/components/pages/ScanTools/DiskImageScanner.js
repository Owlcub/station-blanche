import React, { useState } from 'react';
import './FileScanner.css';
import { Button, Loading } from '../../design-system';
import { HardDrive, Upload, Play, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import API_URL from '../../../config';

const DiskImageScanner = () => {
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
      const response = await fetch(`${API_URL}/api/pc/scan/disk-image`, {
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
        <HardDrive size={32} color="#10b981" />
        <div>
          <h3>Scan d'Image Disque</h3>
          <p>Analysez des images disques (.dd, .img, .raw) pour détecter des malwares</p>
        </div>
      </div>

      <div className="upload-section">
        <div className="upload-box">
          <Upload size={48} />
          <p>Choisissez une image disque à scanner</p>
          <label className="upload-btn">
            <input
              type="file"
              accept=".dd,.img,.raw,.iso"
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
              Lancer le scan
            </Button>
          </div>
        )}

        {scanning && (
          <div className="scanning-status">
            <Loading text="Scan en cours..." />
            <p>Montage de l'image, détection de l'OS et scan antivirus...</p>
            <p className="warning">⏱️ Cela peut prendre plusieurs minutes selon la taille de l'image</p>
          </div>
        )}

        {error && (
          <div className="scan-error">
            <AlertTriangle size={24} />
            <p>{error}</p>
          </div>
        )}

        {scanResult && (
          <div className="scan-result">
            <div className="result-header">
              <CheckCircle size={32} color={scanResult.threats_found > 0 ? '#f59e0b' : '#10b981'} />
              <h3>Scan terminé</h3>
            </div>

            <div className="result-stats">
              <div className="stat-item">
                <span className="stat-label">OS Détecté:</span>
                <span className="stat-value">{scanResult.os_detected}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Fichiers analysés:</span>
                <span className="stat-value">{scanResult.total_files}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Menaces trouvées:</span>
                <span className={`stat-value ${scanResult.threats_found > 0 ? 'danger' : 'success'}`}>
                  {scanResult.threats_found}
                </span>
              </div>
            </div>

            {scanResult.threats && scanResult.threats.length > 0 && (
              <div className="threats-list">
                <h4><AlertTriangle size={20} /> Menaces détectées</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Fichier</th>
                      <th>Menace</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResult.threats.map((threat, idx) => (
                      <tr key={idx}>
                        <td><FileText size={16} /> {threat.file}</td>
                        <td className="threat-name">{threat.threat}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {scanResult.threats_found === 0 && (
              <div className="clean-result">
                <CheckCircle size={48} color="#10b981" />
                <h4>✨ Aucune menace détectée</h4>
                <p>L'image disque est propre</p>
              </div>
            )}

            <Button onClick={() => { setUploadedFile(null); setScanResult(null); }}>
              Scanner une autre image
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiskImageScanner;
