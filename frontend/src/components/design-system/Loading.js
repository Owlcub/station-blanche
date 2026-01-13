import React from 'react';
import './Loading.css';

const Loading = ({ size = 'md', text = 'Chargement...' }) => {
  return (
    <div className={`loading loading-${size}`}>
      <div className="loading-spinner"></div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default Loading;
