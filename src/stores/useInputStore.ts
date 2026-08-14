/* eslint-disable @typescript-eslint/no-unused-vars */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// 1. DEFINIR LAS ACCIONES (Lo que el jugador PUEDE hacer)
export type InputAction = 'ROTATE_CAMERA' | 'MOVE_FORWARD' | 'MOVE_BACK' | 'MOVE_LEFT' | 'MOVE_RIGHT' | 'SPRINT' | 'JUMP' | 'TOGGLE_MODE';

// 2. DEFINIR EL MAPA POR DEFECTO (Qué tecla activa qué acción)
interface InputState {
  keyMap: Record<InputAction, string>; // Ej: { ROTATE_CAMERA: 'Shift' }
  activeActions: Record<InputAction, boolean>; // Ej: { ROTATE_CAMERA: true } (está presionada)
  
  // Acciones para remapear (Futuro)
  setKeyBinding: (action: InputAction, newKey: string) => void;
  
  // Acciones internas (para los Event Listeners)
  setKeyPressed: (key: string, pressed: boolean) => void;
}

export const useInputStore = create<InputState>()(subscribeWithSelector((set) => ({
  // CONFIGURACIÓN INICIAL (El "Banco")
  keyMap: {
    'ROTATE_CAMERA': 'Shift',
    'MOVE_FORWARD': 'w',
    'MOVE_BACK': 's',
    'MOVE_LEFT': 'a',
    'MOVE_RIGHT': 'd',
    'SPRINT': 'Control',
    'JUMP': ' ',
    'TOGGLE_MODE': 'Tab'
  },

  // ESTADO EN TIEMPO REAL
  activeActions: {
    'ROTATE_CAMERA': false,
    'MOVE_FORWARD': false,
    'MOVE_BACK': false,
    'MOVE_LEFT': false,
    'MOVE_RIGHT': false,
    'SPRINT': false,
    'JUMP': false,
    'TOGGLE_MODE': false
  },

  setKeyBinding: (action, newKey) => set((state) => ({
    keyMap: { ...state.keyMap, [action]: newKey }
  })),

  setKeyPressed: (key, pressed) => set((state) => {
    // Buscamos qué acción corresponde a esta tecla
    // (Búsqueda inversa: Key -> Action)
    const actionEntry = Object.entries(state.keyMap).find(([_, mappedKey]) => mappedKey.toLowerCase() === key.toLowerCase());
    
    if (actionEntry) {
      const actionName = actionEntry[0] as InputAction;
      // Solo actualizamos si el estado cambió para evitar renders innecesarios
      if (state.activeActions[actionName] !== pressed) {
          return {
            activeActions: { ...state.activeActions, [actionName]: pressed }
          };
      }
    }
    return {};
  }),
})));