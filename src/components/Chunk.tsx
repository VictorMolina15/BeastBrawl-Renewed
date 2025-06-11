import { useMemo } from 'react';
import { RigidBody, TrimeshCollider } from '@react-three/rapier';
import { Instances, Instance } from '@react-three/drei';
import { MATERIALS } from '../components/LevelUI';

// --- FUNCIÓN DE GREEDY MESHING (CORREGIDA Y OPTIMIZADA) ---
// Genera una malla "hueca" que solo contiene las caras exteriores.
function generateGreedyChunkMesh(data: Uint8Array, chunkSize: number) {
  const vertices: number[] = [];
  const indices: number[] = [];
  
  // Mapa para rastrear vértices y evitar duplicados
  const vertexMap = new Map<string, number>();

  const getVoxel = (x: number, y: number, z: number) => {
    if (x < 0 || x >= chunkSize || y < 0 || y >= chunkSize || z < 0 || z >= chunkSize) {
      return 0; // Tratar fuera de los límites como aire
    }
    return data[z * chunkSize * chunkSize + y * chunkSize + x];
  };

  // Función para añadir un vértice o reutilizar uno existente
  const addVertex = (x: number, y: number, z: number) => {
    const key = `${x},${y},${z}`;
    if (vertexMap.has(key)) {
      return vertexMap.get(key)!;
    }
    const index = vertices.length / 3;
    vertices.push(x, y, z);
    vertexMap.set(key, index);
    return index;
  };

  for (let x = 0; x < chunkSize; x++) {
    for (let y = 0; y < chunkSize; y++) {
      for (let z = 0; z < chunkSize; z++) {
        const materialId = getVoxel(x, y, z);
        if (materialId === 0) continue;

        // Verificamos cada una de las 6 direcciones para ver si hay una cara expuesta
        // El orden de los vértices (winding order) es crucial para que la normal apunte hacia afuera.

        // Cara Derecha (+X)
        if (getVoxel(x + 1, y, z) === 0) {
          const v1 = addVertex(x + 1, y, z);
          const v2 = addVertex(x + 1, y, z + 1);
          const v3 = addVertex(x + 1, y + 1, z);
          const v4 = addVertex(x + 1, y + 1, z + 1);
          indices.push(v1, v2, v3, v2, v4, v3);
        }

        // Cara Izquierda (-X)
        if (getVoxel(x - 1, y, z) === 0) {
          const v1 = addVertex(x, y, z + 1);
          const v2 = addVertex(x, y, z);
          const v3 = addVertex(x, y + 1, z + 1);
          const v4 = addVertex(x, y + 1, z);
          indices.push(v1, v2, v3, v2, v4, v3);
        }
        
        // Cara Superior (+Y)
        if (getVoxel(x, y + 1, z) === 0) {
          const v1 = addVertex(x, y + 1, z + 1);
          const v2 = addVertex(x + 1, y + 1, z + 1);
          const v3 = addVertex(x, y + 1, z);
          const v4 = addVertex(x + 1, y + 1, z);
          indices.push(v1, v2, v3, v2, v4, v3);
        }

        // Cara Inferior (-Y)
        if (getVoxel(x, y - 1, z) === 0) {
          const v1 = addVertex(x, y, z);
          const v2 = addVertex(x + 1, y, z);
          const v3 = addVertex(x, y, z + 1);
          const v4 = addVertex(x + 1, y, z + 1);
          indices.push(v1, v2, v3, v2, v4, v3);
        }
        
        // --- Caras Frontal y Trasera OMITIDAS para optimización 2.5D ---
        // Descomenta estas secciones si alguna vez necesitas colisiones 3D completas
        /*
        // Cara Frontal (+Z)
        if (getVoxel(x, y, z + 1) === 0) {
          const v1 = addVertex(x + 1, y, z + 1);
          const v2 = addVertex(x, y, z + 1);
          const v3 = addVertex(x + 1, y + 1, z + 1);
          const v4 = addVertex(x, y + 1, z + 1);
          indices.push(v1, v2, v3, v2, v4, v3);
        }
        // Cara Trasera (-Z)
        if (getVoxel(x, y, z - 1) === 0) {
          const v1 = addVertex(x, y, z);
          const v2 = addVertex(x + 1, y, z);
          const v3 = addVertex(x, y + 1, z);
          const v4 = addVertex(x + 1, y + 1, z);
          indices.push(v1, v2, v3, v2, v4, v3);
        }
        */
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
  const { visualInstances, physicsMesh } = useMemo(() => {
    // La lógica para las instancias visuales sigue mostrando todos los cubos sólidos
    const instances: { pos: [number, number, number]; key: string, materialId: number }[] = [];
    for (let x = 0; x < chunkSize; x++) {
      for (let y = 0; y < chunkSize; y++) {
        for (let z = 0; z < chunkSize; z++) {
          const materialId = data[z * chunkSize * chunkSize + y * chunkSize + x];
          if (materialId !== 0) {
            instances.push({ pos: [x, y, z], key: `${x}-${y}-${z}`, materialId });
          }
        }
      }
    }
    
    // Llamamos a nuestra nueva función de Greedy Meshing
    const mesh = generateGreedyChunkMesh(data, chunkSize);
    return { visualInstances: instances, physicsMesh: mesh };
  }, [data, chunkSize]);

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      {/* Usamos el TrimeshCollider con la malla de "cáscara hueca" optimizada */}
      {physicsMesh.vertices.length > 0 && (
        <TrimeshCollider args={[physicsMesh.vertices, physicsMesh.indices]} />
      )}
      
      {/* El renderizado visual con Instancias sigue siendo rápido */}
      <Instances limit={visualInstances.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
        {visualInstances.map(({ key, pos, materialId }) => (
          <Instance 
            key={key} 
            position={[pos[0] + 0.5, pos[1] + 0.5, pos[2] + 0.5]} 
            color={MATERIALS[materialId] || 'white'}
          />
        ))}
      </Instances>
    </RigidBody>
  );
}