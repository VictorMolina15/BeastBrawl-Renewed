import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useTerrainStore } from './stores/useTerrainStore';
import { Physics } from '@react-three/rapier';
import { Player } from './components/Player';
import { Chunk } from './components/Chunk';
import { DoubleSide } from 'three';

function ClickHandler() {
  const createTerrain = useTerrainStore((state) => state.createTerrain);
  const destroyTerrain = useTerrainStore((state) => state.destroyTerrain);

  return (
    <mesh
      onClick={(e) => {
        e.stopPropagation();
        createTerrain(e.point.x, e.point.y, e.point.z, 5);
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        e.nativeEvent.preventDefault();
        destroyTerrain(e.point.x, e.point.y, e.point.z, 5);
      }}
    >
      <planeGeometry args={[1000, 1000]} rotation={[-Math.PI / 2, 0, 0]} />
      <meshStandardMaterial transparent opacity={0} side={DoubleSide} />
    </mesh>
  );
}

export default function App() {
  const chunks = useTerrainStore((state) => state.chunks);
  const chunkSize = useTerrainStore((state) => state.chunkSize);

  return (
    <Canvas camera={{ position: [25, 25, 25], fov: 60 }}>
      <Physics debug>
        <ambientLight intensity={0.5} />
        <directionalLight position={[50, 50, 50]} intensity={1.5} castShadow />
        
        {/* El bucle de renderizado de chunks, ahora funcionando */}
        {Array.from(chunks.entries()).map(([key, data]) => {
          const [cx, cy, cz] = key.split(',').map(Number);
          const position: [number, number, number] = [cx * chunkSize, cy * chunkSize, cz * chunkSize];
          
          return <Chunk key={key} data={data} position={position} chunkSize={chunkSize} />;
        })}

        <Player />
        <ClickHandler />
        <OrbitControls />
      </Physics>
    </Canvas>
  );
}