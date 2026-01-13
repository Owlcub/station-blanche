import React, { useState } from 'react';
import './VirtualKeyboard.css';
import { Delete, ChevronsUp } from 'lucide-react';

const VirtualKeyboard = ({ onKeyPress, onBackspace, onEnter }) => {
  const [shift, setShift] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const keys = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'],
    ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
    ['w', 'x', 'c', 'v', 'b', 'n', '@', '.', '_']
  ];

  const specialKeys = ['!', '#', '$', '%', '&', '*', '+', '=', '/', '?'];

  const handleKeyPress = (key) => {
    const isUpper = shift || capsLock;
    const finalKey = isUpper ? key.toUpperCase() : key;
    onKeyPress(finalKey);

    if (shift && !capsLock) {
      setShift(false);
    }
  };

  const handleShift = () => {
    setShift(!shift);
  };

  const handleCapsLock = () => {
    setCapsLock(!capsLock);
    setShift(false);
  };

  return (
    <div className="virtual-keyboard">
      <div className="keyboard-header">
        <span>Clavier virtuel</span>
        {capsLock && <span className="caps-indicator">CAPS LOCK</span>}
      </div>

      {keys.map((row, rowIndex) => (
        <div key={rowIndex} className="keyboard-row">
          {row.map((key) => (
            <button
              key={key}
              className="key"
              onClick={() => handleKeyPress(key)}
            >
              {shift || capsLock ? key.toUpperCase() : key}
            </button>
          ))}
        </div>
      ))}

      {/* Special characters row */}
      <div className="keyboard-row">
        {specialKeys.map((key) => (
          <button
            key={key}
            className="key key-special"
            onClick={() => onKeyPress(key)}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Control keys row */}
      <div className="keyboard-row keyboard-controls">
        <button
          className={`key key-shift ${shift ? 'active' : ''}`}
          onClick={handleShift}
        >
          ⇧ Maj
        </button>
        <button
          className={`key key-caps ${capsLock ? 'active' : ''}`}
          onClick={handleCapsLock}
        >
          <ChevronsUp size={20} /> CAPS
        </button>
        <button className="key key-space" onClick={() => onKeyPress(' ')}>
          Espace
        </button>
        <button className="key key-backspace" onClick={onBackspace}>
          <Delete size={20} /> Effacer
        </button>
        <button className="key key-enter" onClick={onEnter}>
          ↵ Entrée
        </button>
      </div>
    </div>
  );
};

export default VirtualKeyboard;
