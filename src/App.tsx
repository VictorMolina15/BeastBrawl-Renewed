// src/App.tsx (VERSIÓN CORREGIDA FINAL)

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Terrain } from './components/Terrain';
import { useTerrainStore } from './stores/useTerrainStore';
import { Physics } from '@react-three/rapier';
import { Player } from './components/Player';

function ClickHandler() {
  const destroyTerrain = useTerrainStore((state) => state.destroyTerrain);
  
  // ¡CORRECCIÓN! Usamos selectores separados para los valores primitivos.
  const width = useTerrainStore((state) => state.width);
  const height = useTerrainStore((state) => state.height);

  return (
    <mesh
      visible={false}
      onClick={(e) => {

        const clickX = Math.floor(e.point.x + width / 2);
        const clickY = Math.floor(e.point.y + height / 2);
        destroyTerrain(clickX, clickY, 10);
      }}
    >
      <planeGeometry args={[width, height]} />
    </mesh>
  );
}

export default function App() {
  return (
    <Canvas camera={{ position: [0, 0, 80], zoom: 6 }} orthographic>
      <Physics debug> 
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} />
      <Terrain />
      <Player />
      <ClickHandler />
      <OrbitControls />
      </Physics>
    </Canvas>
  );
}