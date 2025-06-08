// src/components/Terrain.tsx
import React from 'react'; // React es necesario para JSX y React.ReactElement
import { useTerrainStore } from '../stores/useTerrainStore';
import { Box } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';

// Hacemos explícito que Terrain es un componente de React que devuelve un elemento de React.
export function Terrain(): React.ReactElement {

  const grid = useTerrainStore((state) => state.grid);
  const width = useTerrainStore((state) => state.width);
  const height = useTerrainStore((state) => state.height);


  return (
    <group>
      {Array.from(grid).map((cellValue: number, index: number) => {
        if (cellValue === 0) {
          return null;
        }
        const x = index % width;
        const y = Math.floor(index / width);
        return (
          <RigidBody key={`voxel-${x}-${y}`} type="fixed" colliders={false}>
            <CuboidCollider args={[0.5, 0.5, 0.5]}
             position={[x - width / 2, y - height / 2, 0]} 
             friction={0}
             restitution={0}/>
            {/* El <Box> ahora es solo visual, la física la maneja el CuboidCollider.
            Lo movemos a la misma posición para que coincidan. */}
            <Box position={[x - width / 2, y - height / 2, 0]}>
              <meshStandardMaterial color="saddlebrown" />
            </Box>
          </RigidBody>
        );
      })}
    </group>
  );
}