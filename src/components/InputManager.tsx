import { useEffect } from 'react';
import { useInputStore } from '../stores/useInputStore';
import { useTerrainStore } from '../stores/useTerrainStore'

export function InputManager() {
  const setKeyPressed = useInputStore((state) => state.setKeyPressed);
  const undo = useTerrainStore((state) => state.undo);
  const redo = useTerrainStore((state) => state.redo);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Atajos de teclado para Deshacer/Rehacer
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
          e.preventDefault();
          return;
        }
        if (e.key.toLowerCase() === 'y') {
          redo();
          e.preventDefault();
          return;
        }
      }
      
      setKeyPressed(e.key, true);
    };
    const handleKeyUp = (e: KeyboardEvent) => setKeyPressed(e.key, false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setKeyPressed, undo, redo]);

  return null; // Este componente no renderiza nada visual
}