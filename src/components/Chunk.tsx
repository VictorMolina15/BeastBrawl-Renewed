import { useMemo, useLayoutEffect, useRef } from 'react';
import { RigidBody, TrimeshCollider } from '@react-three/rapier';
import { useTerrainStore } from '../stores/useTerrainStore';
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib';
import { MATERIALS_DB } from '../config/materials';
// ==========================================
// 1. GEOMETRÍAS NATIVAS (Diseño Asimétrico)
// ==========================================
// Orientación Base: Todo "mira" o "sube" hacia la DERECHA (+X)
const extrudeSettings = { depth: 1, bevelEnabled: false };
const smoothSettings = { depth: 1, bevelEnabled: false, curveSegments: 8 }; 
const radius = 0.3; 

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
const trapGeoVisual = new THREE.ExtrudeGeometry(trapShape, extrudeSettings);
trapGeoVisual.center();

// D. ROUND FULL (Bloque solitario totalmente redondeado)

const roundFullShape = new THREE.Shape();
roundFullShape.moveTo(-0.5 + radius, 0.5);
roundFullShape.lineTo(0.5 - radius, 0.5); // Top
roundFullShape.quadraticCurveTo(0.5, 0.5, 0.5, 0.5 - radius); // Top-Right Corner
roundFullShape.lineTo(0.5, -0.5 + radius); // Right
roundFullShape.quadraticCurveTo(0.5, -0.5, 0.5 - radius, -0.5); // Bottom-Right Corner
roundFullShape.lineTo(-0.5 + radius, -0.5); // Bottom
roundFullShape.quadraticCurveTo(-0.5, -0.5, -0.5, -0.5 + radius); // Bottom-Left Corner
roundFullShape.lineTo(-0.5, 0.5 - radius); // Left
roundFullShape.quadraticCurveTo(-0.5, 0.5, -0.5 + radius, 0.5); // Top-Left Corner
const roundFullGeo = new THREE.ExtrudeGeometry(roundFullShape, smoothSettings).center();

// E. ROUND LEFT (Redondo a la izquierda, plano a la derecha) [ (--- ]
const roundLeftShape = new THREE.Shape();
roundLeftShape.moveTo(-0.5 + radius, 0.5);
roundLeftShape.lineTo(0.5, 0.5);  // Top Flat
roundLeftShape.lineTo(0.5, -0.5); // Right Flat
roundLeftShape.lineTo(-0.5 + radius, -0.5);
roundLeftShape.quadraticCurveTo(-0.5, -0.5, -0.5, -0.5 + radius); // Bottom-Left
roundLeftShape.lineTo(-0.5, 0.5 - radius);
roundLeftShape.quadraticCurveTo(-0.5, 0.5, -0.5 + radius, 0.5);   // Top-Left
const roundLeftGeo = new THREE.ExtrudeGeometry(roundLeftShape, smoothSettings).center();

// F. ROUND RIGHT (Plano a la izquierda, redondo a la derecha) [ ---) ]
const roundRightShape = new THREE.Shape();
roundRightShape.moveTo(-0.5, 0.5); // Top Flat
roundRightShape.lineTo(0.5 - radius, 0.5);
roundRightShape.quadraticCurveTo(0.5, 0.5, 0.5, 0.5 - radius);    // Top-Right
roundRightShape.lineTo(0.5, -0.5 + radius);
roundRightShape.quadraticCurveTo(0.5, -0.5, 0.5 - radius, -0.5);  // Bottom-Right
roundRightShape.lineTo(-0.5, -0.5); // Bottom Flat
roundRightShape.lineTo(-0.5, 0.5);  // Left Flat
const roundRightGeo = new THREE.ExtrudeGeometry(roundRightShape, smoothSettings).center();

// G. ROUND TOP (Capitel de Columna)
const roundTopShape = new THREE.Shape();
roundTopShape.moveTo(-0.5, 0.5 - radius); // Start Top-Left curve
roundTopShape.quadraticCurveTo(-0.5, 0.5, -0.5 + radius, 0.5); // Curve to Top
roundTopShape.lineTo(0.5 - radius, 0.5); // Top Line
roundTopShape.quadraticCurveTo(0.5, 0.5, 0.5, 0.5 - radius); // Curve to Right
roundTopShape.lineTo(0.5, -0.5); // Right Line Down
roundTopShape.lineTo(-0.5, -0.5); // Bottom Line
roundTopShape.lineTo(-0.5, 0.5 - radius); // Close
const roundTopGeo = new THREE.ExtrudeGeometry(roundTopShape, smoothSettings).center();

// H. ROUND BOTTOM (Base de Columna)
const roundBottomShape = new THREE.Shape();
roundBottomShape.moveTo(-0.5, 0.5); // Top Left
roundBottomShape.lineTo(0.5, 0.5);  // Top Right
roundBottomShape.lineTo(0.5, -0.5 + radius); // Right Down
roundBottomShape.quadraticCurveTo(0.5, -0.5, 0.5 - radius, -0.5); // Curve Bottom Right
roundBottomShape.lineTo(-0.5 + radius, -0.5); // Bottom Line
roundBottomShape.quadraticCurveTo(-0.5, -0.5, -0.5, -0.5 + radius); // Curve Bottom Left
roundBottomShape.lineTo(-0.5, 0.5); // Close
const roundBottomGeo = new THREE.ExtrudeGeometry(roundBottomShape, smoothSettings).center();

// TOPPER DE PASTO (Una "gorra" que va encima)
// Es un poco más ancha que 1x1 para que sobresalga
const topShape = new THREE.Shape();
topShape.moveTo(-0.55, -0.1); 
topShape.lineTo(0.55, -0.1); 
topShape.lineTo(0.55, 0.1); 
topShape.lineTo(-0.55, 0.1); 

// LIMPIEZA PARA FÍSICA
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

type RenderGroup = {
  cubes: THREE.Matrix4[];
  ramps: THREE.Matrix4[];
  traps: THREE.Matrix4[];
  roundFull: THREE.Matrix4[];
  roundLeft: THREE.Matrix4[];
  roundRight: THREE.Matrix4[];
  roundTop: THREE.Matrix4[];
  roundBottom: THREE.Matrix4[];

};

// ==========================================
// 2. SUB-COMPONENTE: CHUNK LAYER
// Se encarga de renderizar UN material específico.
// ==========================================
const ChunkLayer = ({ matId, group, onClick, onContext }: { 
  matId: number, 
  group: RenderGroup, 
  onClick: (e: unknown) => void, 
  onContext: (e: unknown) => void 
}) => {
  const refs = useRef<Record<string, THREE.InstancedMesh>>(null!);
  
  if (!refs.current) refs.current = {};

  const materialInfo = MATERIALS_DB[matId] || { color: '#ff00ff' };

  const updateRef = (key: keyof RenderGroup, matrices: THREE.Matrix4[]) => {
    const mesh = refs.current[key];
    if (mesh && matrices.length > 0) {
        for (let i = 0; i < matrices.length; i++) mesh.setMatrixAt(i, matrices[i]);
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.geometry) mesh.computeBoundingSphere();
    }
  };

  useLayoutEffect(() => {
    (Object.keys(group) as Array<keyof RenderGroup>).forEach(key => updateRef(key, group[key]));
  }, [group]);

  return (
    <group>
      {group.cubes.length > 0 && <instancedMesh ref={(el) => { refs.current.cubes = el! }} args={[boxGeoVisual, undefined, group.cubes.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}><meshStandardMaterial color={materialInfo.color} /></instancedMesh>}
      {group.ramps.length > 0 && <instancedMesh ref={(el) => { refs.current.ramps = el! }} args={[rampGeoVisual, undefined, group.ramps.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}><meshStandardMaterial color={materialInfo.color} /></instancedMesh>}
      {group.traps.length > 0 && <instancedMesh ref={(el) => { refs.current.traps = el! }} args={[trapGeoVisual, undefined, group.traps.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}><meshStandardMaterial color={materialInfo.color} /></instancedMesh>}
      
      {group.roundFull.length > 0 && <instancedMesh ref={(el) => { refs.current.roundFull = el! }} args={[roundFullGeo, undefined, group.roundFull.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}><meshStandardMaterial color={materialInfo.color} /></instancedMesh>}
      {group.roundLeft.length > 0 && <instancedMesh ref={(el) => { refs.current.roundLeft = el! }} args={[roundLeftGeo, undefined, group.roundLeft.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}><meshStandardMaterial color={materialInfo.color} /></instancedMesh>}
      {group.roundRight.length > 0 && <instancedMesh ref={(el) => { refs.current.roundRight = el! }} args={[roundRightGeo, undefined, group.roundRight.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}><meshStandardMaterial color={materialInfo.color} /></instancedMesh>}
      {group.roundTop.length > 0 && <instancedMesh ref={(el) => { refs.current.roundTop = el! }} args={[roundTopGeo, undefined, group.roundTop.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}><meshStandardMaterial color={materialInfo.color} /></instancedMesh>}
      {group.roundBottom.length > 0 && <instancedMesh ref={(el) => { refs.current.roundBottom = el! }} args={[roundBottomGeo, undefined, group.roundBottom.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}><meshStandardMaterial color={materialInfo.color} /></instancedMesh>}

      {/* He quitado el pasto temporalmente como pediste, pero si lo descomentas, usa también { } */}
      {/* {group.grassTops.length > 0 && <instancedMesh ref={(el) => { refs.current.grassTops = el! }} ... />} */}
    </group>
  );
};

// ==========================================
// 3. COMPONENTE PRINCIPAL: CHUNK
// ==========================================

export function Chunk({ data, position, chunkSize }: ChunkProps) {
  const createTerrain = useTerrainStore(state => state.createTerrain);
  const destroyTerrain = useTerrainStore(state => state.destroyTerrain);
  const brushSize = useTerrainStore(state => state.brushSize);
  const selectedMaterialId = useTerrainStore(state => state.selectedMaterialId);
  const getGlobalVoxel = useTerrainStore(state => state.getVoxel);

  const meshRefs = useRef<Record<number, { 
    cubes: THREE.InstancedMesh | null, 
    ramps: THREE.InstancedMesh | null, 
    traps: THREE.InstancedMesh | null,
    roundFull: THREE.InstancedMesh | null,
    roundLeft: THREE.InstancedMesh | null,
    roundRight: THREE.InstancedMesh | null,
    roundTop: THREE.InstancedMesh | null,
    roundBottom: THREE.InstancedMesh | null,
  }>>({});

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

  const { renderGroups, physicsData } = useMemo(() => {
    const geometriesToMerge: THREE.BufferGeometry[] = [];
    const groups: Record<number, RenderGroup> = {};
    const dummy = new THREE.Object3D();
    const MODEL_SCALE = 1;

    const isSolidGlobal = (lx: number, ly: number, lz: number) => {
      const wx = position[0] + lx;
      const wy = position[1] + ly;
      const wz = position[2] + lz;
      return getGlobalVoxel(wx, wy, wz) !== 0;
    };
    const getMaterial = (index: number) => data[index];

    for (let z = 0; z < chunkSize; z++) {
      for (let y = 0; y < chunkSize; y++) {
        for (let x = 0; x < chunkSize; x++) {
          const index = z * chunkSize * chunkSize + y * chunkSize + x;
          const matId = getMaterial(index);
          if (matId === 0) continue;
          if (!groups[matId]) {
            groups[matId] = { cubes: [], ramps: [], traps: [] , roundFull: [], roundLeft: [], roundRight: [], roundTop: [], roundBottom: []};
          }

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
                if (!left && !right) {
                    shapeType = 'ROUND_FULL'; // Isla solitaria
                } else if (!left && right) {
                    shapeType = 'ROUND_LEFT'; // Inicio plataforma
                } else if (left && !right) {
                    shapeType = 'ROUND_RIGHT'; // Fin plataforma 
                } else {
                    shapeType = 'CUBE'; // Centro plataforma
                }          
            }
            
            // Si solo hay aire arriba -> considerar rampas/traps
            else if (!top) {
            // CASO A: ISLA / PICO (Aire a ambos lados)
            if (!left && !right) {
               if (bottom) {
               shapeType = 'CUBE'; 
               } else {
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
            
            // 2. TECHO (Aire Abajo) - Solo evaluamos si todavía somos CUBE
            if (shapeType === 'CUBE' && !bottom && top) {

              if (!left && !right) {
                 shapeType = 'ROUND_BOTTOM'; // Base de columna
              }
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
            // 3. COLUMNA SUPERIOR (Aire Arriba, Suelo Abajo, Sin lados)
          // Esto arregla el "Pilar" que querías redondeado arriba
          else if (shapeType === 'CUBE' && !top && bottom && !left && !right) {
              shapeType = 'ROUND_TOP';
          }

            // Convertir RAMP a TRAP si tiene otra rampa arriba o abajo en la misma dirección
            if (shapeType === 'RAMP') {
              const hasRampAbove = top && (
              (left && !isSolidGlobal(x - 1, y + 1, z)) ||
              (!left && !isSolidGlobal(x + 1, y + 1, z))
              );
              const hasRampBelow = bottom && (
              (left && !isSolidGlobal(x - 1, y - 1, z)) ||
              (!left && !isSolidGlobal(x + 1, y - 1, z))
              );
              
              if (hasRampAbove || hasRampBelow) {
              shapeType = 'TRAP';
              }
            }

            dummy.updateMatrix();

          // 3. ASIGNACIÓN A ARRAYS CORREGIDA
          if (shapeType === 'RAMP') {
            groups[matId].ramps.push(dummy.matrix.clone()); 
            
            const g = rampGeoPhys.clone();
            g.applyMatrix4(dummy.matrix);
            geometriesToMerge.push(g);
          } 
          else if (shapeType === 'TRAP') {
            groups[matId].traps.push(dummy.matrix.clone());
            
            const g = trapGeoPhys.clone();
            g.applyMatrix4(dummy.matrix);
            geometriesToMerge.push(g);
          }
          else if (shapeType === 'ROUND_FULL') {
            groups[matId].roundFull.push(dummy.matrix.clone());
            // Para mantener coherencia con tu optimización, añadimos las caras manualmente:
            addFace(planePhys, x, y+0.5, z, -Math.PI/2, 'x', geometriesToMerge);
            addFace(planePhys, x, y-0.5, z, Math.PI/2, 'x', geometriesToMerge);
            addFace(planePhys, x-0.5, y, z, Math.PI/2, 'y', geometriesToMerge);
            addFace(planePhys, x+0.5, y, z, -Math.PI/2, 'y', geometriesToMerge);
          }
          else if (shapeType === 'ROUND_LEFT') {
            groups[matId].roundLeft.push(dummy.matrix.clone());
            addFace(planePhys, x, y+0.5, z, -Math.PI/2, 'x', geometriesToMerge);
            addFace(planePhys, x, y-0.5, z, Math.PI/2, 'x', geometriesToMerge);
            addFace(planePhys, x-0.5, y, z, Math.PI/2, 'y', geometriesToMerge);
            addFace(planePhys, x+0.5, y, z, -Math.PI/2, 'y', geometriesToMerge);
          }
          else if (shapeType === 'ROUND_RIGHT') {
            groups[matId].roundRight.push(dummy.matrix.clone());
            addFace(planePhys, x, y+0.5, z, -Math.PI/2, 'x', geometriesToMerge);
            addFace(planePhys, x, y-0.5, z, Math.PI/2, 'x', geometriesToMerge);
            addFace(planePhys, x-0.5, y, z, Math.PI/2, 'y', geometriesToMerge);
            addFace(planePhys, x+0.5, y, z, -Math.PI/2, 'y', geometriesToMerge);
          }
          else if (shapeType === 'ROUND_TOP'){
            groups[matId].roundTop.push(dummy.matrix.clone());
            addFace(planePhys, x, y+0.5, z, -Math.PI/2, 'x', geometriesToMerge);
            addFace(planePhys, x, y-0.5, z, Math.PI/2, 'x', geometriesToMerge);
            addFace(planePhys, x-0.5, y, z, Math.PI/2, 'y', geometriesToMerge);
            addFace(planePhys, x+0.5, y, z, -Math.PI/2, 'y', geometriesToMerge);

          }
          else if (shapeType === 'ROUND_BOTTOM'){
            groups[matId].roundBottom.push(dummy.matrix.clone());
            addFace(planePhys, x, y+0.5, z, -Math.PI/2, 'x', geometriesToMerge);
            addFace(planePhys, x, y-0.5, z, Math.PI/2, 'x', geometriesToMerge);
            addFace(planePhys, x-0.5, y, z, Math.PI/2, 'y', geometriesToMerge);
            addFace(planePhys, x+0.5, y, z, -Math.PI/2, 'y', geometriesToMerge);
          }
          else {
            // CUBE
            groups[matId].cubes.push(dummy.matrix.clone());
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
      renderGroups: groups,
      physicsData: { vertices: finalVertices, indices: finalIndices }
    };

  }, [data, chunkSize, getGlobalVoxel, position]);

  useLayoutEffect(() => {
    Object.keys(renderGroups).forEach(key => {
      const matId = Number(key);
      const group = renderGroups[matId];

      const refs = meshRefs.current[matId];
      if (refs) {
        (Object.keys(group) as Array<keyof RenderGroup>).forEach(k => {

            const mesh = refs[k];
            if (mesh && group[k].length > 0) {
                group[k].forEach((m, i) => mesh.setMatrixAt(i, m));
                mesh.instanceMatrix.needsUpdate = true;
            }
        });
      }
    });
  }, [renderGroups]);

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

      {Object.keys(renderGroups).map((key) => {
        const matId = Number(key);
        // Inicializar refs para este material si no existen
        if (!meshRefs.current[matId]) meshRefs.current[matId] = { cubes: null, ramps: null, traps: null, roundFull: null, roundLeft: null, 
          roundRight: null, roundTop: null, roundBottom: null };
        
        return (
          <ChunkLayer 
            key={key} 
            matId={matId} 
            group={renderGroups[matId]} 
            onClick={handleClick} 
            onContext={handleContext} 
          />
        );
      })}
    </RigidBody>
    );
}