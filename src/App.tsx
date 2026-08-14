import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Stats, OrbitControls, PerspectiveCamera, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import { useTerrainStore } from './stores/useTerrainStore';
import { useCombatStore } from './stores/useCombatStore';
import { Player } from './components/Player';
import { Physics } from '@react-three/rapier';
import { UI } from './components/LevelUI';
import { useState, useEffect, useRef } from 'react';
import { PlacementGrid } from './components/PlacementGrid';
import { Terrain } from './components/Terrain';
import { InputManager } from './components/InputManager';
import { useInputStore } from './stores/useInputStore';
import { Background } from './components/Background';
import { MOUSE } from 'three';

const INITIAL_CENTER = [63, 30, 0] as const;
const INITIAL_ZOOM = 13;
const INITIAL_Z_OFFSET = 120; // Qué tan atrás está la cámara

const CameraLogger = ({ domRef }: { domRef: React.RefObject<HTMLDivElement> }) => {
  const { camera } = useThree();

  useFrame(() => {
    if (domRef.current) {
      const x = camera.position.x.toFixed(1);
      const y = camera.position.y.toFixed(1);
      const z = camera.position.z.toFixed(1);
      const zoom = camera.type === 'OrthographicCamera'
        ? `Zoom: ${camera.zoom.toFixed(2)}`
        : `FOV: ${camera instanceof THREE.PerspectiveCamera ? camera.fov : 'N/A'}`;

      domRef.current.innerText = `POS: [${x}, ${y}, ${z}]\n${zoom}`;
    }
  });
  return null;
};

const CameraController = ({ isOrthographic, isShiftPressed }: { isOrthographic: boolean, isShiftPressed: boolean }) => {
  const controlsRef = useRef<OrbitControlsType>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(INITIAL_CENTER[0], INITIAL_CENTER[1], INITIAL_CENTER[2]);
      controlsRef.current.update();
      camera.lookAt(INITIAL_CENTER[0], INITIAL_CENTER[1], INITIAL_CENTER[2]);
    }
  }, [isOrthographic, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      key={isOrthographic ? 'ortho' : 'persp'}

      // 2. SIEMPRE HABILITADO (Para que el click medio funcione sin teclas)
      enabled={true}

      // 3. CONFIGURACIÓN DE PANE (Arrastre)
      enablePan={true} // Permitir arrastrar siempre
      panSpeed={isOrthographic ? 1 : 2} // Ajustar velocidad si se siente lento

      // 4. CONFIGURACIÓN DE ROTACIÓN
      // Solo permitimos rotar si SHIFT está presionado (Tu requisito)
      enableRotate={!isOrthographic && isShiftPressed}

      // 5. MAPEO DE BOTONES DEL MOUSE
      mouseButtons={{
        LEFT: undefined,     // Dejamos el izquierdo libre para el juego (Poner Bloques)
        MIDDLE: MOUSE.PAN,   // Click Medio = Arrastrar (Pan)
        RIGHT: MOUSE.ROTATE  // Click Derecho = Rotar (Solo funciona si enableRotate es true)
      }}

      zoomSpeed={isOrthographic ? 1 : 0.5}
      target={[INITIAL_CENTER[0], INITIAL_CENTER[1], INITIAL_CENTER[2]]}
    />
  );
}

export default function App() {
  const appMode = useCombatStore((state) => state.appMode);
  const mapId = useTerrainStore((state) => state.mapId);
  const [isOrthographic, setIsOrthographic] = useState(true);
  const toggleCamera = () => setIsOrthographic(prev => !prev);
  const cameraInfoRef = useRef<HTMLDivElement>(null!);

  // 1. USAMOS EL NUEVO SISTEMA DE INPUT
  const isRotatePressed = useInputStore((state) => state.activeActions['ROTATE_CAMERA']);

  useEffect(() => {
    const unsubscribe = useInputStore.subscribe(
      (state) => state.activeActions['TOGGLE_MODE'],
      (isPressed) => {
        if (isPressed) {
          const currentAppMode = useCombatStore.getState().appMode;
          if (currentAppMode === 'EDITOR') {
            useTerrainStore.getState().saveSnapshot();
            useCombatStore.getState().setMode('TRAINING');
            useCombatStore.getState().setAppMode('COMBAT');
          } else {
            useTerrainStore.getState().restoreSnapshot();
            useCombatStore.getState().setAppMode('EDITOR');
          }
        }
      }
    );

    return unsubscribe;
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <InputManager />
      <UI
        isOrthographic={isOrthographic}
        toggleCamera={toggleCamera}
        cameraInfoRef={cameraInfoRef}
      />

      <Canvas>
        <CameraLogger domRef={cameraInfoRef} />

        {isOrthographic ? (
          <OrthographicCamera
            makeDefault
            position={[INITIAL_CENTER[0], INITIAL_CENTER[1], INITIAL_Z_OFFSET]}
            zoom={INITIAL_ZOOM}
            near={-100} far={1000}
          />
        ) : (
          <PerspectiveCamera
            makeDefault
            position={[INITIAL_CENTER[0], INITIAL_CENTER[1], 80]}
            fov={50}
            near={0.1} far={1000}
          />
        )}
        <Background />
        <Physics debug={false} gravity={[0, -20, 0]}>
          <ambientLight intensity={1.5} />
          <directionalLight position={[100, 100, 100]} intensity={1.5} />
          <Terrain />
          {appMode === 'EDITOR' && <PlacementGrid />}
          {appMode === 'COMBAT' && <Player key={`player_${mapId}`} />}

          {/* CONTROLADOR DE CÁMARA EXTRAÍDO */}
          <CameraController
            isOrthographic={isOrthographic}
            isShiftPressed={isRotatePressed}
          />
          <Stats />
        </Physics>
      </Canvas>
    </div>
  );
}