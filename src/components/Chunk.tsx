import { useMemo } from 'react';
import { RigidBody, TrimeshCollider, interactionGroups } from '@react-three/rapier';
import { Instances, Instance } from '@react-three/drei';
import { MATERIALS } from './LevelUI'; 

const TERRAIN_COLLISION_GROUP = interactionGroups(0b10, 0b1);

// --- FUNCIÓN DE "MESHING" OPTIMIZADA ---
function generateOptimizedChunkMesh(data: Uint8Array, chunkSize: number) {
  const vertices: number[] = [];
  const indices: number[] = [];
  let vertexIndex = 0;

  const getVoxel = (x: number, y: number, z: number) => {
    if (x < 0 || x >= chunkSize || y < 0 || y >= chunkSize || z < 0 || z >= chunkSize) {
      return 0;
    }
    return data[z * chunkSize * chunkSize + y * chunkSize + x];
  };

  for (let x = 0; x < chunkSize; x++) {
    for (let y = 0; y < chunkSize; y++) {
      for (let z = 0; z < chunkSize; z++) {
        const voxel = getVoxel(x, y, z);

        if (voxel === 1) {
          // Chequeamos los 6 vecinos. Si un vecino es aire (0), añadimos esa cara.
          const neighbors = {
            right: getVoxel(x + 1, y, z) === 0,
            left: getVoxel(x - 1, y, z) === 0,
            top: getVoxel(x, y + 1, z) === 0,
            bottom: getVoxel(x, y - 1, z) === 0,
            front: getVoxel(x, y, z + 1) === 0,
            back: getVoxel(x, y, z - 1) === 0,
          };

          if (Object.values(neighbors).every(v => !v)) continue; // Cubo interior, no añadir nada

          const px = x; const py = y; const pz = z;
          const cubeVertices = [
            [px, py, pz], [px + 1, py, pz], [px + 1, py + 1, pz], [px, py + 1, pz],
            [px, py, pz + 1], [px + 1, py, pz + 1], [px + 1, py + 1, pz + 1], [px, py + 1, pz + 1]
          ];
          const baseIndex = vertexIndex;

          if (neighbors.front)  indices.push(baseIndex+4, baseIndex+5, baseIndex+6, baseIndex+4, baseIndex+6, baseIndex+7);
          if (neighbors.back)   indices.push(baseIndex+0, baseIndex+1, baseIndex+2, baseIndex+0, baseIndex+2, baseIndex+3);
          if (neighbors.left)   indices.push(baseIndex+4, baseIndex+0, baseIndex+3, baseIndex+4, baseIndex+3, baseIndex+7);
          if (neighbors.right)  indices.push(baseIndex+1, baseIndex+5, baseIndex+6, baseIndex+1, baseIndex+6, baseIndex+2);
          if (neighbors.top)    indices.push(baseIndex+3, baseIndex+2, baseIndex+6, baseIndex+3, baseIndex+6, baseIndex+7);
          if (neighbors.bottom) indices.push(baseIndex+0, baseIndex+1, baseIndex+5, baseIndex+0, baseIndex+5, baseIndex+4);
          
          vertices.push(...cubeVertices.flat());
          vertexIndex += 8;
        }
      }
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}


interface ChunkProps {
  data: Uint8Array;
  position: [number, number, number];
  chunkSize: number;
}

export function Chunk({ data, position, chunkSize }: ChunkProps) {
 
  // Memoizamos tanto las instancias visuales como la malla de colisión
  const { visualInstances, physicsMesh } = useMemo(() => {
    const instances: { pos: [number, number, number], color: string, key: number }[] = [];
    for (let x = 0; x < chunkSize; x++) {
      for (let y = 0; y < chunkSize; y++) {
        for (let z = 0; z < chunkSize; z++) {
          const index = z * chunkSize * chunkSize + y * chunkSize + x;
          const materialId = data[index];
          if (materialId !== 0) { // Si no es aire
            instances.push({ 
              pos: [x + 0.5, y + 0.5, z + 0.5],
              color: MATERIALS[materialId] !== undefined ? String(MATERIALS[materialId]) : 'white',
              key: index
            });
          }
        }
      }
    }
    
    // Generamos la malla para la física una sola vez
    const mesh = generateOptimizedChunkMesh(data, chunkSize);

    return { visualInstances: instances, physicsMesh: mesh };
  }, [data, chunkSize]);


  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      {/* --- LA GRAN OPTIMIZACIÓN --- */}
      {/* Un solo TrimeshCollider para todo el chunk */}
      {physicsMesh.vertices.length > 0 && (
        <TrimeshCollider 
        args={[physicsMesh.vertices, physicsMesh.indices]}
        collisionGroups={TERRAIN_COLLISION_GROUP} />
      )}
      
      {/* El renderizado visual sigue siendo súper rápido con Instances */}
      <Instances>
        <boxGeometry args={[1, 1, 1]} /> 
       {/* --- Aplicamos el color del store --- */}
        <meshStandardMaterial/>
        {visualInstances.map(({ key, pos, color }) => (
          <Instance key={key} position={pos} color={color} />
        ))}
      </Instances>
    </RigidBody>
  );
}