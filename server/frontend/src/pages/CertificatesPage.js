import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Usb, XCircle } from 'lucide-react';
import './SharedPages.css';

function CertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      const response = await axios.get('/api/v1/certificates/sync');
      setCertificates(response.data.certificates);
    } catch (error) {
      console.error('Error loading certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (certId) => {
    if (!window.confirm('Révoquer ce certificat ?')) return;
    
    try {
      await axios.put(`/api/v1/certificates/${certId}/revoke`, {
        reason: 'Révoqué depuis le dashboard',
        revoked_by: 'admin'
      });
      loadCertificates();
    } catch (error) {
      alert('Erreur lors de la révocation');
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1><Shield size={28} /> Certificats USB</h1>
        <p>Tous les certificats émis par les stations</p>
      </div>

      <div className="table-card">
        {certificates.length === 0 ? (
          <p className="empty-state">Aucun certificat</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>UUID USB</th>
                <th>Label</th>
                <th>Émis le</th>
                <th>Expire le</th>
                <th>Station</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map(cert => (
                <tr key={cert.id}>
                  <td><code>{cert.usb_uuid}</code></td>
                  <td><Usb size={14} className="inline-icon" /> {cert.usb_label || '-'}</td>
                  <td>{new Date(cert.issued_at).toLocaleString('fr-FR')}</td>
                  <td>{new Date(cert.expires_at).toLocaleString('fr-FR')}</td>
                  <td>{cert.station_id || '-'}</td>
                  <td>
                    <button 
                      className="btn-icon btn-danger"
                      onClick={() => handleRevoke(cert.certificate_id)}
                      title="Révoquer"
                    >
                      <XCircle size={16} />
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

export default CertificatesPage;
