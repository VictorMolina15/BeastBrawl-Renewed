// src/components/Terrain.tsx
import React from 'react'; // React es necesario para JSX y React.ReactElement
import { useTerrainStore } from '../stores/useTerrainStore';
import { Chunk } from './Chunk';

// Hacemos explícito que Terrain es un componente de React que devuelve un elemento de React.
export function Terrain(): React.ReactElement {

  const chunks = useTerrainStore((state) => state.chunks);
  const variations = useTerrainStore((state) => state.variations); // <--- IMPORTANTE: Obtenemos el mapa de variaciones
  const chunkSize = useTerrainStore((state) => state.chunkSize);


 return (
    <group>
      {Array.from(chunks.entries()).map(([key, chunkData]) => {
        
        const [x, y, z] = key.split(',').map(Number);
        
        const chunkVariations = variations.get(key);

        return (
          <Chunk
            key={key}
            position={[x * chunkSize, y * chunkSize, z * chunkSize]}
            chunkSize={chunkSize}
            data={chunkData}
            variations={chunkVariations!} // Pasamos las variaciones (el ! indica a TS que confiamos, o actualiza la interfaz abajo)
          />
        );
      })}
    </group>
  );
}