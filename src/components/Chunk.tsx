// src/components/Chunk.tsx
import { useMemo } from 'react';
import { RigidBody, TrimeshCollider } from '@react-three/rapier';
import { useTerrainStore } from '../stores/useTerrainStore';
import * as THREE from 'three';
import { generateMarchingCubesMesh } from '../lib/MarchingCubesUtils'; // ¡Nuestra nueva función!

interface ChunkProps {
  data: Uint8Array;
  position: [number, number, number];
  chunkSize: number;
}

export function Chunk({ position, chunkSize }: ChunkProps) {
  const destroyTerrain = useTerrainStore(state => state.destroyTerrain);
  const createTerrain = useTerrainStore(state => state.createTerrain);
  const brushSize = useTerrainStore(state => state.brushSize);
  const selectedMaterialId = useTerrainStore(state => state.selectedMaterialId);
  const chunks = useTerrainStore(state => state.chunks);

  // useMemo sigue siendo clave para el rendimiento
  const geometryData = useMemo(() => {
    // --- LÓGICA PARA CREAR DATOS CON RELLENO (PADDED DATA) ---
    const [cx, cy] = [position[0] / chunkSize, position[1] / chunkSize];
    const paddedSize = chunkSize + 2;
    const paddedData = new Uint8Array(paddedSize * paddedSize * paddedSize).fill(1); // Rellenar con aire por defecto

    const getVoxelFromChunk = (chunkData: Uint8Array, x: number, y: number, z: number) => {
      return chunkData[z * chunkSize * chunkSize + y * chunkSize + x];
    };

    // Iteramos sobre la nueva cuadrícula más grande
    for (let z = 0; z < paddedSize; z++) {
      for (let y = 0; y < paddedSize; y++) {
        for (let x = 0; x < paddedSize; x++) {
          const worldX = (cx * chunkSize) + x - 1;
          const worldY = (cy * chunkSize) + y - 1;
          const worldZ = z - 1;

          const chunkX = Math.floor(worldX / chunkSize);
          const chunkY = Math.floor(worldY / chunkSize);
          
          const neighborChunkKey = `${chunkX},${chunkY},0`;
          const neighborChunkData = chunks.get(neighborChunkKey);
          
          let value = 1; // Aire por defecto si no hay vecino
          if (neighborChunkData) {
            const localX = worldX - chunkX * chunkSize;
            const localY = worldY - chunkY * chunkSize;
            const localZ = worldZ;
            
            if (localZ >= 0 && localZ < chunkSize) { // Asumimos un solo nivel de chunks en Z
                 value = getVoxelFromChunk(neighborChunkData, localX, localY, localZ);
            }
          }

          const paddedIndex = z * paddedSize * paddedSize + y * paddedSize + x;
          paddedData[paddedIndex] = value;
        }
      }
    }
    
    // Pasamos los datos con relleno a nuestra función
    return generateMarchingCubesMesh(paddedData, [paddedSize, paddedSize, paddedSize]);
  }, [chunks, position, chunkSize]);

  // Creamos la geometría de Three.js a partir de nuestros datos
  const visualGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(geometryData.vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(geometryData.indices, 1));
    geo.computeVertexNormals();

    return geo;
  }, [geometryData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!e.face) return;
    const newVoxelPos = new THREE.Vector3().copy(e.point).add(e.face.normal.clone().multiplyScalar(-0.5));
    createTerrain(newVoxelPos.x, newVoxelPos.y, brushSize, selectedMaterialId);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleContextMenu = (e: any) => {
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    if (!e.face) return;
    const existingVoxelPos = new THREE.Vector3().copy(e.point).add(e.face.normal.clone().multiplyScalar(0.5));
    destroyTerrain(existingVoxelPos.x, existingVoxelPos.y, brushSize);
  };

  // Comprobación de seguridad: solo renderizar si hay algo que mostrar
  const hasVertices = geometryData.vertices.length > 0;

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      {hasVertices && (
        <>
          {/* AHORA SÍ: Creamos un colisionador indexado con datos limpios y predecibles */}
          <TrimeshCollider
            args={[geometryData.vertices, geometryData.indices]}
          />
          
          <mesh
            castShadow
            receiveShadow
            geometry={visualGeometry}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
          >
            <meshStandardMaterial color="green" side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </RigidBody>
  );
}