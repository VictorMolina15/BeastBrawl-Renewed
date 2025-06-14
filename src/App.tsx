import { Canvas } from '@react-three/fiber';
import { Stats, OrbitControls } from '@react-three/drei';
import { useTerrainStore } from './stores/useTerrainStore';
import { Player } from './components/Player';
import { Physics } from '@react-three/rapier';
import { Chunk } from './components/Chunk';
import { UI } from './components/LevelUI';
import { useState, useEffect } from 'react';



export default function App() {
  const chunks = useTerrainStore((state) => state.chunks);
  const chunkSize = useTerrainStore((state) => state.chunkSize);
  const mapId = useTerrainStore((state) => state.mapId);
  // --- Estado para la cámara ---
  const [isOrthographic, setIsOrthographic] = useState(true); // Empecemos en ortográfica
  const toggleCamera = () => setIsOrthographic(prev => !prev);

 

   // --- Lógica para el Modo Shift y la Cámara ---
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* La UI se renderiza fuera del Canvas */}
      <UI isOrthographic={isOrthographic} toggleCamera={toggleCamera} />

      <Canvas orthographic={isOrthographic} camera={{
        ...(isOrthographic
          ? { position: [0, 0, 120], zoom: 10 } // Configuración para ortográfica
          : { position: [0, 0, 120], fov: 60 }), // Configuración para perspectiva
        rotation: [0, 0, 0]
      }} >
        <Physics debug gravity={[0, -20, 0]}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[100, 100, 100]} intensity={1.5} />

          {Array.from(chunks.entries()).map(([key, data]) => {
            const [cx, cy, cz] = key.split(',').map(Number);
            const position: [number, number, number] = [cx * chunkSize, cy * chunkSize, cz * chunkSize];
            return <Chunk key={key} data={data} position={position} chunkSize={chunkSize} />;
          })}

          {/* --- Usamos mapId como key en el Player --- */}
          {/* Cuando mapId cambie, este componente se destruirá y se creará de nuevo */}
          <Player key={mapId} />
          <OrbitControls 
          key={isOrthographic ? 'ortho' : 'persp'}
          enabled={isShiftPressed} 
          enableRotate={!isOrthographic} // En ortográfica, solo rota con Shift
          />
          {/* --- UI de Depuración --- */}
          <Stats /> 
        </Physics>
      </Canvas>
    </div>
  );
}