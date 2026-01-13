// Configuration de l'API URL
// Détecte automatiquement l'IP de la station (DHCP ou localhost)
// Frontend et backend tournent sur la même machine

const getApiUrl = () => {
  // Si variable d'environnement définie
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // En mode développement ou accès local direct
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }

  // En production : utiliser le même hostname que le frontend (DHCP compatible)
  return `http://${window.location.hostname}:8000`;
};

const API_URL = getApiUrl();

export default API_URL;
