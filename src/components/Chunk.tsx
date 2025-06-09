import { useMemo } from 'react';
import { RigidBody, TrimeshCollider } from '@react-three/rapier';
import isosurface from 'isosurface';
import * as THREE from 'three';

interface ChunkProps {
  data: Uint8Array;
  position: [number, number, number];
  chunkSize: number;
}

export function Chunk({ data, position, chunkSize }: ChunkProps) {
  const geometryData = useMemo(() => {
    const potential = (x: number, y: number, z: number): number => {
      if (x < 0 || x >= chunkSize || y < 0 || y >= chunkSize || z < 0 || z >= chunkSize) {
        return 1;
      }
      const index = Math.floor(z) * chunkSize * chunkSize + Math.floor(y) * chunkSize + Math.floor(x);
      
      return 1.0 - data[index]; 
    };
    
    // --- LA CORRECCIÓN FINAL Y DEFINITIVA ---
    // Añadimos el tipo explícito a la constante 'dimensions'.
    const dimensions: [number, number, number] = [chunkSize, chunkSize, chunkSize];
    
    const result = isosurface.surfaceNets(potential, dimensions);

    if (!result.positions.length || !result.cells.length) {
      return null;
    }

    const vertices = new Float32Array(result.positions.flat());
    const indices = new Uint16Array(result.cells.flat());

    return { vertices, indices };
  }, [data, chunkSize]);

  if (!geometryData) {
    return null;
  }

  const { vertices, indices } = geometryData;

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      {vertices.length > 0 && indices.length > 0 && (
        <TrimeshCollider args={[vertices, indices]} />
      )}
      
      <mesh>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
          <bufferAttribute attach="index" args={[indices, 1]} />
        </bufferGeometry>
        <meshStandardMaterial color="forestgreen" side={THREE.DoubleSide} wireframe={true} />
      </mesh>
    </RigidBody>
  );
}