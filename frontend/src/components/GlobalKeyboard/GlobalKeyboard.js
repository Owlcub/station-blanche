import React, { useState, useEffect } from 'react';
import VirtualKeyboard from '../VirtualKeyboard/VirtualKeyboard';
import './GlobalKeyboard.css';

const GlobalKeyboard = () => {
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [activeInput, setActiveInput] = useState(null);

  useEffect(() => {
    const handleFocus = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        setActiveInput(e.target);
        setShowKeyboard(true);
      }
    };

    const handleClick = (e) => {
      // Masquer le clavier si on clique en dehors d'un input et du clavier
      if (
        !e.target.closest('.global-keyboard-container') &&
        e.target.tagName !== 'INPUT' &&
        e.target.tagName !== 'TEXTAREA'
      ) {
        setShowKeyboard(false);
        setActiveInput(null);
      }
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const handleKeyPress = (key) => {
    if (!activeInput) return;

    const start = activeInput.selectionStart || 0;
    const end = activeInput.selectionEnd || 0;
    const currentValue = activeInput.value;

    const newValue = currentValue.substring(0, start) + key + currentValue.substring(end);

    // Mettre à jour la valeur
    activeInput.value = newValue;

    // Déclencher l'événement onChange pour React
    const event = new Event('input', { bubbles: true });
    activeInput.dispatchEvent(event);

    // Positionner le curseur
    const newCursorPos = start + key.length;
    activeInput.setSelectionRange(newCursorPos, newCursorPos);
  };

  const handleBackspace = () => {
    if (!activeInput) return;

    const start = activeInput.selectionStart || 0;
    const end = activeInput.selectionEnd || 0;
    const currentValue = activeInput.value;

    let newValue;
    let newCursorPos;

    if (start !== end) {
      // Il y a une sélection, on la supprime
      newValue = currentValue.substring(0, start) + currentValue.substring(end);
      newCursorPos = start;
    } else if (start > 0) {
      // Pas de sélection, on supprime le caractère avant le curseur
      newValue = currentValue.substring(0, start - 1) + currentValue.substring(start);
      newCursorPos = start - 1;
    } else {
      return; // Rien à supprimer
    }

    activeInput.value = newValue;

    const event = new Event('input', { bubbles: true });
    activeInput.dispatchEvent(event);

    activeInput.setSelectionRange(newCursorPos, newCursorPos);
  };

  const handleEnter = () => {
    if (!activeInput) return;

    // Si c'est un textarea, insérer un retour à la ligne
    if (activeInput.tagName === 'TEXTAREA') {
      handleKeyPress('\n');
    } else {
      // Si c'est un input, chercher le formulaire parent et le soumettre
      const form = activeInput.closest('form');
      if (form) {
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton && !submitButton.disabled) {
          submitButton.click();
        }
      }
    }
  };

  if (!showKeyboard) return null;

  return (
    <div className="global-keyboard-container">
      <div className="global-keyboard-backdrop" onClick={() => setShowKeyboard(false)} />
      <div className="global-keyboard-wrapper">
        <button
          className="keyboard-close-btn"
          onClick={() => setShowKeyboard(false)}
        >
          ✕ Fermer le clavier
        </button>
        <VirtualKeyboard
          onKeyPress={handleKeyPress}
          onBackspace={handleBackspace}
          onEnter={handleEnter}
        />
      </div>
    </div>
  );
};

export default GlobalKeyboard;
