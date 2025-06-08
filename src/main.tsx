// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { KeyboardControls, type KeyboardControlsEntry } from '@react-three/drei';

// 1. Definimos nuestro mapa de controles
export const Controls = {
  forward: 'forward',
  backward: 'backward',
  left: 'left',
  right: 'right',
  jump: 'jump',
} as const;

// El tipo de nuestras acciones se puede derivar del objeto
export type ControlActions = (typeof Controls)[keyof typeof Controls];

// El mapa sigue funcionando igual, pero ahora usamos nuestro objeto
const map: KeyboardControlsEntry<ControlActions>[] = [
  { name: Controls.forward, keys: ['ArrowUp', 'w', 'W'] },
  { name: Controls.backward, keys: ['ArrowDown', 's', 'S'] },
  { name: Controls.left, keys: ['ArrowLeft', 'a', 'A'] },
  { name: Controls.right, keys: ['ArrowRight', 'd', 'D'] },
  { name: Controls.jump, keys: ['Space'] },
];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KeyboardControls map={map}>
      <App />
    </KeyboardControls>
  </StrictMode>,
);