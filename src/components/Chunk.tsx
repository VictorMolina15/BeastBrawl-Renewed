import { useMemo } from 'react';
import { RigidBody, TrimeshCollider } from '@react-three/rapier';
import { Instances, Instance } from '@react-three/drei';
import { useTerrainStore } from '../stores/useTerrainStore';
import * as THREE from 'three';
import { MATERIALS } from '../components/LevelUI';

// --- FUNCIÓN DE GREEDY MESHING (SIN CARAS EN EL EJE Z) ---
function generateGreedyChunkMesh(data: Uint8Array, chunkSize: number) {
  const vertices: number[] = [];
  const indices: number[] = [];

  const getVoxel = (x: number, y: number, z: number) => {
    if (x < 0 || x >= chunkSize || y < 0 || y >= chunkSize || z < 0 || z >= chunkSize) return 0;
    return data[z * chunkSize * chunkSize + y * chunkSize + x];
  };

  // Recorremos las 3 dimensiones (x, y, z)
  for (let d = 0; d < 3; d++) {
    // Saltar el eje Z (d === 2)
    if (d === 2) continue;

    const u = (d + 1) % 3;
    const v = (d + 2) % 3;

    const x = [0, 0, 0];
    const q = [0, 0, 0];
    q[d] = 1;

    const mask = new Int32Array(chunkSize * chunkSize);

    // Iteramos a través de cada "rebanada" del chunk
    for (x[d] = -1; x[d] < chunkSize; ) {
      let n = 0;
      for (x[v] = 0; x[v] < chunkSize; x[v]++) {
        for (x[u] = 0; x[u] < chunkSize; x[u]++) {
          const a = getVoxel(x[0], x[1], x[2]);
          const b = getVoxel(x[0] + q[0], x[1] + q[1], x[2] + q[2]);
          mask[n++] = (a !== 0 && b === 0) ? a : (a === 0 && b !== 0) ? -b : 0;
        }
      }
      x[d]++;

      n = 0;
      for (let j = 0; j < chunkSize; j++) {
        for (let i = 0; i < chunkSize; ) {
          if (mask[n] !== 0) {
            const w = (() => {
              let k = 1;
              while (i + k < chunkSize && mask[n + k] === mask[n]) {
                k++;
              }
              return k;
            })();
            const h = (() => {
              for (let k = 1; j + k < chunkSize; k++) {
                for (let l = 0; l < w; l++) {
                  if (mask[n + l + k * chunkSize] !== mask[n]) return k;
                }
              }
              return chunkSize - j;
            })();

            const side = mask[n] > 0;
            x[u] = i; x[v] = j;

            const du = [0, 0, 0]; du[u] = w;
            const dv = [0, 0, 0]; dv[v] = h;

            const v1 = [x[0], x[1], x[2]];
            const v2 = [x[0] + du[0], x[1] + du[1], x[2] + du[2]];
            const v3 = [x[0] + dv[0], x[1] + dv[1], x[2] + dv[2]];
            const v4 = [x[0] + du[0] + dv[0], x[1] + du[1] + dv[1], x[2] + du[2] + dv[2]];
            
            const vo = vertices.length / 3;
            vertices.push(...v1, ...v2, ...v3, ...v4);
            if (side) {
              indices.push(vo, vo + 2, vo + 1, vo + 2, vo + 3, vo + 1);
            } else {
              indices.push(vo, vo + 1, vo + 2, vo + 1, vo + 3, vo + 2);
            }

            for (let l = 0; l < h; ++l) {
              for (let k = 0; k < w; ++k) {
                mask[i + k + (j + l) * chunkSize] = 0;
              }
            }
            i += w; n += w;
          } else {
            i++; n++;
          }
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
  // Obtenemos las funciones y el estado que necesitamos del store
  const createTerrain = useTerrainStore(state => state.createTerrain);
  const destroyTerrain = useTerrainStore(state => state.destroyTerrain);
  const brushSize = useTerrainStore(state => state.brushSize);
  const selectedMaterialId = useTerrainStore(state => state.selectedMaterialId);

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

  const handleClick = (e: THREE.Intersection) => {
    e.stopPropagation(); // Detenemos el evento para que no afecte a OrbitControls
    if (!e.face) return;
    // Para crear, calculamos la posición del nuevo vóxel añadiendo la normal
    // Esto coloca el nuevo cubo "encima" de la cara en la que hemos hecho clic.
    const newVoxelPos = new THREE.Vector3().copy(e.point).add(e.face.normal.clone().multiplyScalar(0.5));
    createTerrain(newVoxelPos.x, newVoxelPos.y, brushSize, selectedMaterialId);
  };

  const handleContextMenu = (e: THREE.Intersection) => {
    e.stopPropagation();
    e.nativeEvent.preventDefault(); // Prevenimos el menú del navegador
    if (!e.face) return;
    // Para destruir, calculamos la posición del vóxel existente restando la normal
    // Esto nos da el centro del cubo cuya cara hemos clickeado.
    const existingVoxelPos = new THREE.Vector3().copy(e.point).sub(e.face.normal.clone().multiplyScalar(0.5));
    destroyTerrain(existingVoxelPos.x, existingVoxelPos.y, brushSize);
  };

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      {/* Usamos el TrimeshCollider con la malla de "cáscara hueca" optimizada */}
      {physicsMesh.vertices.length > 0 && (
        <TrimeshCollider args={[physicsMesh.vertices, physicsMesh.indices]} />
      )}

      {/* El renderizado visual con Instancias sigue siendo rápido */}
      <Instances
        limit={visualInstances.length}
        onClick={(e) => handleClick(e as unknown as THREE.Intersection)}
        onContextMenu={(e) => handleContextMenu(e as unknown as THREE.Intersection)}
      >
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
