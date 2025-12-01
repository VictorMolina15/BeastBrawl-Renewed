import { useMemo, useLayoutEffect, useRef } from 'react';
import { RigidBody, TrimeshCollider } from '@react-three/rapier';
import { useTerrainStore } from '../stores/useTerrainStore';
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib';

// ==========================================
// 1. GEOMETRÍAS NATIVAS (Diseño Asimétrico)
// ==========================================
// Orientación Base: Todo "mira" o "sube" hacia la DERECHA (+X)
const extrudeSettings = { depth: 1, bevelEnabled: false };

// A. CUBO
const boxGeoVisual = new THREE.BoxGeometry(1, 1, 1);

// B. RAMPA TRIANGULAR ( /| )
// Sube de Izq(-0.5, -0.5) a Der(0.5, 0.5). Pared vertical a la derecha.
const rampShape = new THREE.Shape();
rampShape.moveTo(-0.5, -0.5); 
rampShape.lineTo(0.5, -0.5);  
rampShape.lineTo(0.5, 0.5);   
rampShape.lineTo(-0.5, -0.5); 
const rampGeoVisual = new THREE.ExtrudeGeometry(rampShape, extrudeSettings);
rampGeoVisual.center();

// C. SEMI-RAMPA / TRAPECIO ( /¯| )
// Sube de Izq, se aplana arriba, pared vertical a la derecha.
const trapShape = new THREE.Shape();
trapShape.moveTo(-0.5, -0.5); // Abajo Izq
trapShape.lineTo(0.5, -0.5);  // Abajo Der
trapShape.lineTo(0.5, 0.5);   // Arriba Der (Pared)
trapShape.lineTo(0.1, 0.5);   // Medio Arriba (Inicio de la bajada suave)
trapShape.lineTo(-0.5, -0.5);  // Medio Izq (Punto de quiebre)
trapShape.lineTo(-0.5, -0.5); // Cerrar
// Nota: Ajusta los puntos (0.0, 0.5) y (-0.5, 0.0) para cambiar la pendiente del suavizado.
const trapGeoVisual = new THREE.ExtrudeGeometry(trapShape, extrudeSettings);
trapGeoVisual.center();

// D. LIMPIEZA PARA FÍSICA
const cleanGeometry = (geo: THREE.BufferGeometry) => {
  const clean = geo.clone().toNonIndexed();
  if (clean.attributes.uv) clean.deleteAttribute('uv');
  if (clean.attributes.normal) clean.deleteAttribute('normal');
  if (clean.attributes.color) clean.deleteAttribute('color');
  return clean;
};

const planePhys = cleanGeometry(new THREE.PlaneGeometry(1, 1));
const rampGeoPhys = cleanGeometry(rampGeoVisual);
const trapGeoPhys = cleanGeometry(trapGeoVisual);


interface ChunkProps {
  data: Uint8Array;
  position: [number, number, number];
  chunkSize: number;
}

export function Chunk({ data, position, chunkSize }: ChunkProps) {
  const createTerrain = useTerrainStore(state => state.createTerrain);
  const destroyTerrain = useTerrainStore(state => state.destroyTerrain);
  const brushSize = useTerrainStore(state => state.brushSize);
  const selectedMaterialId = useTerrainStore(state => state.selectedMaterialId);
  const getGlobalVoxel = useTerrainStore(state => state.getVoxel);

  const cubesMeshRef = useRef<THREE.InstancedMesh>(null!);
  const rampsMeshRef = useRef<THREE.InstancedMesh>(null!);
  const trapsMeshRef = useRef<THREE.InstancedMesh>(null!);

  // Helper functions
  const addFace = (geo: THREE.BufferGeometry, x: number, y: number, z: number, rot: number, axis: 'x'|'y', target: THREE.BufferGeometry[]) => {
    const p = geo.clone();
    const m = new THREE.Matrix4();
    if (axis === 'x') m.makeRotationX(rot);
    else m.makeRotationY(rot);
    m.setPosition(x, y, z);
    p.applyMatrix4(m);
    target.push(p);
  };

  const updateInstanced = (mesh: THREE.InstancedMesh, mats: THREE.Matrix4[]) => {
    mats.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  };

  const { counts, physicsData, matrices } = useMemo(() => {
    const geometriesToMerge: THREE.BufferGeometry[] = [];
    const matCubes: THREE.Matrix4[] = [];
    const matRamps: THREE.Matrix4[] = [];
    const matTraps: THREE.Matrix4[] = [];

    const dummy = new THREE.Object3D();
    const MODEL_SCALE = 1;

    const isSolidGlobal = (lx: number, ly: number, lz: number) => {
      const wx = position[0] + lx;
      const wy = position[1] + ly;
      const wz = position[2] + lz;
      return getGlobalVoxel(wx, wy, wz) !== 0;
    };

    const isSolidLocal = (index: number) => data[index] !== 0;

    for (let z = 0; z < chunkSize; z++) {
      for (let y = 0; y < chunkSize; y++) {
        for (let x = 0; x < chunkSize; x++) {
          const index = z * chunkSize * chunkSize + y * chunkSize + x;
          if (!isSolidLocal(index)) continue;

          // Vecinos Directos
          const top = isSolidGlobal(x, y + 1, z);
          const bottom = isSolidGlobal(x, y - 1, z);
          const left = isSolidGlobal(x - 1, y, z);
          const right = isSolidGlobal(x + 1, y, z);
          const front = isSolidGlobal(x, y, z + 1);
          const back = isSolidGlobal(x, y, z - 1);
          
          // Diagonales (Cruciales para V2.1)
          const topLeft = isSolidGlobal(x - 1, y + 1, z);
          const topRight = isSolidGlobal(x + 1, y + 1, z);
          const bottomLeft = isSolidGlobal(x - 1, y - 1, z);
          const bottomRight = isSolidGlobal(x + 1, y - 1, z);

          // Culling (Optimización)
          if (top && bottom && left && right && front && back) continue;

          dummy.position.set(x, y, z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);

          let shapeType = 'CUBE'; 

          // ==========================================
          // LÓGICA DE DECISIÓN DE FORMA
          // ==========================================

            // 1. SUPERFICIE (Aire Arriba)
            // Si hay aire tanto arriba como abajo -> mantener CUBE
            if (!top && !bottom) {
            shapeType = 'CUBE';
            }
            // Si solo hay aire arriba -> considerar rampas/traps
            else if (!top) {
            // CASO A: ISLA / PICO (Aire a ambos lados)
            if (!left && !right) {
               // ARREGLO DE LA "X": Solo es Trapecio si tiene soporte abajo.
               if (bottom) {
               // Es una cima de montaña -> Trapecio Simétrico (o asimétrico rotado)
               // Como nuestro trap es /¯|, podemos usar dos o simplemente dejarlo como Cubo si es de 1 de ancho.
               // Según tu dibujo, el pico es /¯\ . Mi geometría base es /¯|. 
               // Para simplificar, si es un pico de 1 bloque, lo dejamos CUBO o TRAPECIO según gusto.
               // Vamos a ponerlo CUBO para evitar cosas raras en la X, o TRAP si quieres suavizar.
               // Si quieres que la X sean cubos -> CUBE.
               shapeType = 'CUBE'; 
               } else {
               // Bloque flotante 1x1 -> CUBE
               shapeType = 'CUBE';
               }
            }
            
            // CASO B: LADO IZQUIERDO (Tierra Izq, Aire Der)
            else if (left && !right) {
               // ¿Tengo un escalón arriba a la izquierda?
               if (topLeft) {
               // Sí -> Soy parte de una escalera -> RAMPA \ 
               shapeType = 'RAMP';
               dummy.rotation.y = Math.PI; // Espejo de /|
               } else {
               // No -> Soy el borde de una plataforma -> TRAPECIO |¯\
               shapeType = 'TRAP';
               dummy.rotation.y = Math.PI; // Espejo de /¯|
               }
            }

            // CASO C: LADO DERECHO (Aire Izq, Tierra Der)
            else if (!left && right) {
               // ¿Tengo escalón arriba a la derecha?
               if (topRight) {
               // Sí -> Escalera -> RAMPA /
               shapeType = 'RAMP';
               dummy.rotation.y = 0; // Base /|
               } else {
               // No -> Borde plataforma -> TRAPECIO /¯|
               shapeType = 'TRAP';
               dummy.rotation.y = 0; // Base /¯|
               }
            }
            }
            
            // 2. TECHO (Aire Abajo) - Solo evaluamos si todavía somos CUBO
            // Nota: añadimos 'top' en la condición para evitar que el caso "aire arriba y abajo" sea modificado aquí.
            if (shapeType === 'CUBE' && !bottom && top) {
             // Lógica Invertida para suavizar techos
             
             // CASO A: TECHO BAJANDO A DERECHA (Tierra Izq, Aire Der)
             if (left && !right) {
              // Miramos la diagonal inferior izquierda
              if (bottomLeft) {
                 shapeType = 'RAMP'; // Escalera de techo
                 dummy.rotation.x = Math.PI;
                 dummy.rotation.y = Math.PI;
              } else {
                 shapeType = 'TRAP'; // Borde suave de techo
                 dummy.rotation.x = Math.PI;
                 dummy.rotation.y = Math.PI;
              }
             }
             
             // CASO B: TECHO BAJANDO A IZQUIERDA (Aire Izq, Tierra Der)
             else if (!left && right) {
              if (bottomRight) {
                 shapeType = 'RAMP';
                 dummy.rotation.x = Math.PI;
                 dummy.rotation.y = 0;
              } else {
                 shapeType = 'TRAP';
                 dummy.rotation.x = Math.PI;
                 dummy.rotation.y = 0;
              }
             }
            }

          dummy.updateMatrix();

          // 3. ASIGNACIÓN A ARRAYS
          if (shapeType === 'RAMP') {
            matRamps.push(dummy.matrix.clone());
            const g = rampGeoPhys.clone();
            g.applyMatrix4(dummy.matrix);
            geometriesToMerge.push(g);
          } 
          else if (shapeType === 'TRAP') {
            matTraps.push(dummy.matrix.clone());
            const g = trapGeoPhys.clone();
            g.applyMatrix4(dummy.matrix);
            geometriesToMerge.push(g);
          }
          else {
            // CUBE
            matCubes.push(dummy.matrix.clone());
            // Física optimizada (solo caras expuestas)
            if (!top) addFace(planePhys, x, y+0.5, z, -Math.PI/2, 'x', geometriesToMerge);
            if (!bottom) addFace(planePhys, x, y-0.5, z, Math.PI/2, 'x', geometriesToMerge);
            if (!left) addFace(planePhys, x-0.5, y, z, Math.PI/2, 'y', geometriesToMerge);
            if (!right) addFace(planePhys, x+0.5, y, z, -Math.PI/2, 'y', geometriesToMerge);
          }
        }
      }
    }

    // Fusión
    let finalVertices = new Float32Array(0);
    let finalIndices = new Uint32Array(0);
    if (geometriesToMerge.length > 0) {
        try {
          const merged = mergeBufferGeometries(geometriesToMerge, false);
          if (merged && merged.attributes.position) {
              const posArray = merged.attributes.position.array as ArrayLike<number>;
              finalVertices = new Float32Array(posArray);
              finalIndices = new Uint32Array(finalVertices.length / 3).map((_, i) => i);
          }
        } catch(e) { console.error(e); }
    }

    return {
      counts: { cubes: matCubes.length, ramps: matRamps.length, traps: matTraps.length },
      matrices: { cubes: matCubes, ramps: matRamps, traps: matTraps },
      physicsData: { vertices: finalVertices, indices: finalIndices }
    };

  }, [data, chunkSize, getGlobalVoxel, position]);

  useLayoutEffect(() => {
    if (cubesMeshRef.current) updateInstanced(cubesMeshRef.current, matrices.cubes);
    if (rampsMeshRef.current) updateInstanced(rampsMeshRef.current, matrices.ramps);
    if (trapsMeshRef.current) updateInstanced(trapsMeshRef.current, matrices.traps);
  }, [matrices]);

  // Handlers (sin cambios)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!e.face) return;
    const newPos = new THREE.Vector3().copy(e.point).add(e.face.normal.clone().multiplyScalar(0.5));
    createTerrain(newPos.x, newPos.y, brushSize, selectedMaterialId);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleContext = (e: any) => {
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    if (!e.face) return;
    const newPos = new THREE.Vector3().copy(e.point).sub(e.face.normal.clone().multiplyScalar(0.5));
    destroyTerrain(newPos.x, newPos.y, brushSize);
  };

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      {physicsData.vertices.length > 0 && (
        <TrimeshCollider args={[physicsData.vertices, physicsData.indices]} />
      )}

      {counts.cubes > 0 && (
        <instancedMesh ref={cubesMeshRef} args={[boxGeoVisual, undefined, counts.cubes]} onClick={handleClick} onContextMenu={handleContext}>
          <meshStandardMaterial color="#8B4513" />
        </instancedMesh>
      )}
      {counts.ramps > 0 && (
        <instancedMesh ref={rampsMeshRef} args={[rampGeoVisual, undefined, counts.ramps]} onClick={handleClick} onContextMenu={handleContext}>
          <meshStandardMaterial color="purple" />
        </instancedMesh>
      )}
      {counts.traps > 0 && (
        <instancedMesh ref={trapsMeshRef} args={[trapGeoVisual, undefined, counts.traps]} onClick={handleClick} onContextMenu={handleContext}>
          <meshStandardMaterial color="cyan" />
        </instancedMesh>
      )}
    </RigidBody>
  );
}