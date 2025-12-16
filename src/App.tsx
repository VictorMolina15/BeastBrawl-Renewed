import { Canvas } from '@react-three/fiber';
import { Stats, OrbitControls } from '@react-three/drei';
import { useTerrainStore } from './stores/useTerrainStore';
import { Player } from './components/Player';
import { Physics } from '@react-three/rapier';
import { UI } from './components/LevelUI';
import { useState, useEffect } from 'react';
import { PlacementGrid } from './components/PlacementGrid';
import { Terrain } from './components/Terrain'; // <--- IMPORTAMOS TERRAIN

export default function App() {
  const mapId = useTerrainStore((state) => state.mapId);
  const [isOrthographic, setIsOrthographic] = useState(true); 
  const toggleCamera = () => setIsOrthographic(prev => !prev);

  const [isShiftPressed, setIsShiftPressed] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShiftPressed(true); };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShiftPressed(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <UI isOrthographic={isOrthographic} toggleCamera={toggleCamera} />

      <Canvas orthographic={isOrthographic} camera={{
        ...(isOrthographic
          ? { position: [0, 0, 120], zoom: 10 } 
          : { position: [0, 0, 120], fov: 60 }), 
        rotation: [0, 0, 0]
      }} >
        <Physics debug gravity={[0, -20, 0]}>
          <ambientLight intensity={1} />
          <directionalLight position={[100, 100, 100]} intensity={1.5} />

          <Terrain />
          
          <PlacementGrid />
          <Player key={mapId} />
          <OrbitControls 
            key={isOrthographic ? 'ortho' : 'persp'}
            enabled={isShiftPressed} 
            enableRotate={!isOrthographic} 
          />
          <Stats /> 
        </Physics>
      </Canvas>
    </div>
  );
}