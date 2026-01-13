// Configuration de l'API URL
// Utilise toujours localhost:8000 car le frontend et backend tournent sur la même machine

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default API_URL;
