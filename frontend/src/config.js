// Configuration de l'API URL
// En production (build), utilise l'IP de la box
// En développement, utilise localhost

const API_URL = process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'http://192.168.100.1:8000'
    : 'http://localhost:8000');

export default API_URL;
