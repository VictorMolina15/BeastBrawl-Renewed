import { useTerrainStore } from '../stores/useTerrainStore';
import { Box } from '@react-three/drei';

interface EmptyChunkProps {
  position: [number, number, number];
  chunkSize: number;
}

export function EmptyChunk({ position, chunkSize }: EmptyChunkProps) {
  const createTerrain = useTerrainStore((state) => state.createTerrain);

  return (
    <Box
      args={[chunkSize, chunkSize, chunkSize]}
      position={position}
      // El clic izquierdo ahora está aquí.
      // Crea una esfera de tierra en el centro del chunk vacío.
      onClick={(e) => {
        e.stopPropagation();
        const [x, y, z] = position;
        createTerrain(x, y, z, 8); // Crea una esfera de radio 8
      }}
    >
      <meshBasicMaterial color="royalblue" wireframe transparent opacity={0.1} />
    </Box>
  );
}