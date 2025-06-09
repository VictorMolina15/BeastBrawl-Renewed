import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useTerrainStore } from './stores/useTerrainStore';
import { Player } from './components/Player';
import { Physics } from '@react-three/rapier';
import { Chunk } from './components/Chunk';
import { DoubleSide } from 'three';

function ClickHandler() {
  const createTerrain = useTerrainStore((state) => state.createTerrain);
  const destroyTerrain = useTerrainStore((state) => state.destroyTerrain);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        createTerrain(e.point.x, e.point.y, e.point.z, 5);
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        // --- LA CORRECCIÓN DEFINITIVA ---
        e.nativeEvent.preventDefault();
        destroyTerrain(e.point.x, e.point.y, e.point.z, 5);
      }}
    >
      <planeGeometry args={[1000, 1000]} />
      <meshStandardMaterial transparent opacity={0} side={DoubleSide} />
    </mesh>
  );
}

export default function App() {
  const chunks = useTerrainStore((state) => state.chunks);
  const chunkSize = useTerrainStore((state) => state.chunkSize);

  return (
    <Canvas camera={{ position: [64, 40, 120], fov: 60 }}>
      <Physics debug gravity={[0, -20, 0]}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 100, 100]} intensity={1.5} />
        
        {Array.from(chunks.entries()).map(([key, data]) => {
          const [cx, cy, cz] = key.split(',').map(Number);
          const position: [number, number, number] = [cx * chunkSize, cy * chunkSize, cz * chunkSize];
          return <Chunk key={key} data={data} position={position} chunkSize={chunkSize} />;
        })}

        <Player />
        <OrbitControls />
        <ClickHandler />
        {/* Vuelve a añadir tu ClickHandler cuando veas el terreno */}
      </Physics>
    </Canvas>
  );
}