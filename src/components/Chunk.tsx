/* eslint-disable @typescript-eslint/no-explicit-any */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { RigidBody, TrimeshCollider } from '@react-three/rapier';
import { useTerrainStore } from '../stores/useTerrainStore';
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib';
import { MATERIALS_DB, ATLAS_CONFIG } from '../config/materials';
import { useGLTF, useTexture } from '@react-three/drei';
import { patchSolidGrassMaterial, patchPropMaterial } from '../shaders';
import { useFrame } from '@react-three/fiber';

useGLTF.preload('/models/cubes/grass/GrassCubes_set.glb');
useGLTF.preload('/models/cubes/base/BaseCubes_set.glb');
// useTexture.preload('/textures/MegaAtlas.png'); // Descomentar si usas suspense

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
trapShape.lineTo(-0.01, 0.5);   // Medio Arriba (Inicio de la bajada suave)
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

// J. GEOMETRÍA CROSS (Para Hierba/Flores)
const createPropGeo = () => {
    // 1. Un solo plano simple
    const geo = new THREE.PlaneGeometry(1, 1);
    
    // 2. Invertir V (igual que antes)
    const uvAttr = geo.attributes.uv;
    if (uvAttr) {
        for (let i = 0; i < uvAttr.count; i++) {
            const y = uvAttr.getY(i);
            uvAttr.setY(i, 1 - y); 
        }
        uvAttr.needsUpdate = true;
    }

    // 3. Blanco por defecto (Evita crash del shader)
    const count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3).fill(1.0); 
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // 4. Iluminación Uniforme
    const normals = geo.attributes.normal;
    if (normals) {
        for (let i = 0; i < normals.count; i++) {
             normals.setXYZ(i, 0, 1, 0);
        }
        normals.needsUpdate = true;
    }

    return geo;
}
const propGeoVisual = createPropGeo()

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
const rampDownGeoPhys = rampGeoPhys.clone().rotateX(Math.PI);
const trapDownGeoPhys = trapGeoPhys.clone().rotateX(Math.PI);

interface ChunkProps {
  data: Uint8Array;
  variations?: Uint8Array;
  position: [number, number, number];
  chunkSize: number;
}

type RenderGroup = {
  cubes: THREE.Matrix4[];
  ramps: THREE.Matrix4[];
  traps: THREE.Matrix4[];
  rampsDown: THREE.Matrix4[];
  trapsDown: THREE.Matrix4[];
  roundFull: THREE.Matrix4[];
  roundLeft: THREE.Matrix4[];
  roundRight: THREE.Matrix4[];
  roundTop: THREE.Matrix4[];
  roundBottom: THREE.Matrix4[];
  props: THREE.Matrix4[];

};

// ==========================================
// 2. SUB-COMPONENTE: CHUNK LAYER
// Se encarga de renderizar UN material específico.
// ==========================================
const ChunkLayer = ({ groupKey, group, onClick, onContext, baseNodes, grassNodes, grassMaterial, baseTexture }: {
  groupKey: string,
  group: RenderGroup,
  onClick: (e: unknown) => void,
  onContext: (e: unknown) => void,
  baseNodes: any,
  grassNodes: any,
  grassMaterial: THREE.Material, // Material del pasto
  baseTexture: THREE.Texture // Textura base
}) => {
  const refs = useRef<Record<string, THREE.InstancedMesh>>(null!);
  if (!refs.current) refs.current = {};

  const [matId, varId] = groupKey.split('_').map(Number);
  const materialDef = MATERIALS_DB[matId];


  // 1. Definir Color (Tinte)
  let targetColorHex = '#ffffff';
  if (materialDef) {
    const variation = materialDef.variations?.[varId];
    targetColorHex = variation ? variation.color : materialDef.color;
  }

  // 2. Determinar si usamos lógica GRASS (Modelos) o BASE (Geometría Código)
  const isGrass = materialDef?.type === 'GRASS';
  const isProp = materialDef?.type === 'PROP';

  // Seleccionar material: Si es Grass usamos el shader especial, si no, uno estándar simple
  // --- LÓGICA DE MATERIAL INTELIGENTE ---
  const activeMaterial = useMemo(() => {
    // 1. EL PASTO SE MANEJA APARTE (Shader especial)
    if (isGrass) return grassMaterial;
    // 2. BUSCAR TEXTURA (Lógica de Prioridad)
    const variation = materialDef.variations?.[varId];
    const effectiveAtlasPos = variation?.atlasPos || materialDef.atlasPos;
    const effectiveColor = isProp ? '#FFFFFF' : targetColorHex;

    // 3. GENERAR MATERIAL
    if (effectiveAtlasPos && baseTexture) {

      const mat = new THREE.MeshStandardMaterial({
        map: baseTexture.clone(),
        roughness: 0.8,
        transparent: isProp,
        alphaTest: 0.5,
        depthWrite: !isProp,
        side: isProp ? THREE.DoubleSide : THREE.FrontSide,
        color: effectiveColor,
        vertexColors: isProp ? true : false,
      });

      if (mat.map) {
        const EPSILON = 0.0016;
        const cols = ATLAS_CONFIG.cols;
        const rows = ATLAS_CONFIG.rows;
        mat.map.repeat.set((1 / cols) - (2 * EPSILON), (1 / rows) - (2 * EPSILON));
        mat.map.offset.x = (effectiveAtlasPos.x / cols) + EPSILON;
        mat.map.offset.y = (effectiveAtlasPos.y / rows) + EPSILON;
      }

      // === CORRECCIÓN VISUAL: SHADER DE VIENTO (Solo Props) ===
      if (isProp) {
        // Inicializamos el objeto de tiempo en el material
        mat.userData = { uTime: { value: 0 } };
        mat.onBeforeCompile = (shader) => {
          patchPropMaterial(shader);
          shader.uniforms.uTime = mat.userData.uTime;
        };
        mat.customProgramCacheKey = () => 'prop_smart_shader';
      }

      return mat;
    }

    // Fallback para materiales sin textura
    return new THREE.MeshStandardMaterial({ color: effectiveColor || 'white' });

  }, [isGrass, isProp, grassMaterial, materialDef, baseTexture, varId, targetColorHex]);

  // Hook de animación para el viento (actualiza el material generado arriba)
  useFrame((state) => {
    if (isProp && activeMaterial.userData?.uTime) {
      activeMaterial.userData.uTime.value = state.clock.getElapsedTime();
    }
  });

  // Helper para actualizar matrices
  const updateRef = (key: keyof RenderGroup, matrices: THREE.Matrix4[]) => {
    const mesh = refs.current[key];
    if (mesh && matrices.length > 0) {
      for (let i = 0; i < matrices.length; i++) mesh.setMatrixAt(i, matrices[i]);
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.geometry) mesh.computeBoundingSphere();

      // Si usamos el material de pasto, necesitamos colorear cada instancia
      if (isGrass || isProp) {
        const c = new THREE.Color(targetColorHex);
        for (let i = 0; i < matrices.length; i++) mesh.setColorAt(i, c);
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
  };

  // Corrección de Geometría invertida
  const createUpsideDownGeometry = (originalGeo: THREE.BufferGeometry) => {
    if (!originalGeo) return null;

    // 1. Clonar y Rotar Físicamente 180° (Poner de cabeza)
    const geo = originalGeo.clone();
    geo.rotateX(Math.PI);

    // 2. CORREGIR UVs (Mantener el patrón visual derecho)
    // Al girar el objeto, la textura también gira. La "desgiramos" aquí.
    const uvAttribute = geo.attributes.uv;
    if (uvAttribute) {
      for (let i = 0; i < uvAttribute.count; i++) {
        const x = uvAttribute.getX(i);
        const y = uvAttribute.getY(i);
        uvAttribute.setX(i, 1 - x); // Invertir coordenada X
        uvAttribute.setY(i, 1 - y); // Invertir coordenada Y
      }
      uvAttribute.needsUpdate = true;
    }

    // 3. Recalcular normales
    geo.computeVertexNormals();
    return geo;
  };

  // Hook para animar el viento
  useFrame((state) => {
    // Si este layer es de tipo PROP o GRASS y tiene el material compilado
    if ((isGrass || materialDef?.type === 'PROP') && activeMaterial.userData?.uTime) {
      activeMaterial.userData.uTime.value = state.clock.getElapsedTime();
    }
  });

  useMemo(() => {
    if (!grassNodes) return;

    // Función para garantizar colores y corregir rotación si es necesario
    const prepareGeometry = (geo: THREE.BufferGeometry, rotationY: number = 0, rotationZ: number = 0) => {
      if (!geo) return;

      // 1. CORRECCIÓN DE COLOR (El culpable del "Todo Verde")
      if (!geo.attributes.color) {
        const count = geo.attributes.position.count;
        const colors = new Float32Array(count * 3).fill(0.0);
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      }

      // 2. CORRECCIÓN DE ROTACIÓN 
      if (rotationY !== 0 && !geo.userData.correctedRot) {
        geo.rotateY(rotationY);
        geo.userData.correctedRot = true;
      }
      if (rotationZ !== 0 && !geo.userData.correctedRot) {
        geo.rotateZ(rotationZ);
        geo.userData.correctedRot = true;
      }
    };
    // Ajuste de valores
    // Math.PI (180°), Math.PI/2 (90°), -Math.PI/2 (-90°)
    //const FIX_90= Math.PI / 2; 
    //const FIX_180= Math.PI;

    // Bloques que necesitan ajuste de rotación
    if (baseNodes.CubeBaseRounded?.geometry) prepareGeometry(baseNodes.CubeBaseRounded.geometry, 0, 0);
    if (grassNodes.CubeGrassR_BottomFlat?.geometry) prepareGeometry(grassNodes.CubeGrassR_BottomFlat.geometry, 0, 0);
  }, [grassNodes, baseNodes]);

  const rampDownGeo = useMemo(() => createUpsideDownGeometry(baseNodes.RampBase?.geometry || rampGeoVisual), [baseNodes]);
  const trapDownGeo = useMemo(() => createUpsideDownGeometry(baseNodes.TrapBase?.geometry || trapGeoVisual), [baseNodes]);

  useLayoutEffect(() => {
    (Object.keys(group) as Array<keyof RenderGroup>).forEach(key => updateRef(key, group[key]));
  }, [group]);// eslint-disable-line react-hooks/exhaustive-deps

  const getGeo = (shape: string) => {
    if (isGrass) {
      // Mapeo a tus modelos GLB
      switch (shape) {
        case 'CUBE': return grassNodes.CubeGrass?.geometry || boxGeoVisual;
        case 'RAMP': return grassNodes.RampGrass?.geometry || rampGeoVisual;
        case 'TRAP': return grassNodes.TrapGrass?.geometry || trapGeoVisual;
        case 'ROUND_FULL': return grassNodes.CubeGrassRounded?.geometry || boxGeoVisual;
        case 'ROUND_LEFT': return grassNodes.CubeGrassR_SideFlat?.geometry || boxGeoVisual;
        case 'ROUND_RIGHT': return grassNodes.CubeGrassR_SideFlat?.geometry || boxGeoVisual;
        case 'ROUND_TOP': return grassNodes.CubeGrassR_BottomFlat?.geometry || boxGeoVisual;
        case 'ROUND_BOTTOM': return grassNodes.CubeGrassR_BottomFlat?.geometry || boxGeoVisual;
        default: return grassNodes.Grass_Cube?.geometry || boxGeoVisual;
      }
    } else if (isProp) {
      return propGeoVisual;
    } else {
      switch (shape) {
        case 'CUBE': return baseNodes.CubeBase?.geometry || boxGeoVisual;
        case 'RAMP': return baseNodes.RampBase?.geometry || rampGeoVisual;
        case 'TRAP': return baseNodes.TrapBase?.geometry || trapGeoVisual;
        case 'RAMP_DOWN': return rampDownGeo || rampGeoVisual;
        case 'TRAP_DOWN': return trapDownGeo || trapGeoVisual;

        case 'ROUND_FULL': return baseNodes.CubeBaseRounded?.geometry || roundFullGeo;

        // SideFlat sirve para todos los lados curvos
        case 'ROUND_LEFT': return baseNodes.CubeBaseR_SideFlat?.geometry || roundLeftGeo;
        case 'ROUND_RIGHT': return baseNodes.CubeBaseR_SideFlat?.geometry || roundRightGeo;

        // Para Top/Bottom usamos SideFlat rotado (se rota en la matriz dummy)
        case 'ROUND_TOP': return baseNodes.CubeBaseR_BottomFlat?.geometry || roundTopGeo;
        case 'ROUND_BOTTOM': return baseNodes.CubeBaseR_BottomFlat?.geometry || roundBottomGeo;

        default: return baseNodes.CubeBase?.geometry || boxGeoVisual;
      }
    }
  };

  return (
    <group>
      <instancedMesh ref={(el) => { refs.current.cubes = el! }} args={[getGeo('CUBE'), undefined, group.cubes.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}>
        <primitive object={activeMaterial} attach="material" />
      </instancedMesh>
      <instancedMesh ref={(el) => { refs.current.ramps = el! }} args={[getGeo('RAMP'), undefined, group.ramps.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}>
        <primitive object={activeMaterial} attach="material" /></instancedMesh>
      <instancedMesh ref={(el) => { refs.current.traps = el! }} args={[getGeo('TRAP'), undefined, group.traps.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}>
        <primitive object={activeMaterial} attach="material" /></instancedMesh>
      <instancedMesh ref={(el) => { refs.current.rampsDown = el! }} args={[getGeo('RAMP_DOWN'), undefined, group.rampsDown.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}>
        <primitive object={activeMaterial} attach="material" /></instancedMesh>
      <instancedMesh ref={(el) => { refs.current.trapsDown = el! }} args={[getGeo('TRAP_DOWN'), undefined, group.trapsDown.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}>
        <primitive object={activeMaterial} attach="material" /></instancedMesh>

      <instancedMesh ref={(el) => { refs.current.roundFull = el! }} args={[getGeo('ROUND_FULL'), undefined, group.roundFull.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}>
        <primitive object={activeMaterial} attach="material" /></instancedMesh>
      <instancedMesh ref={(el) => { refs.current.roundLeft = el! }} args={[getGeo('ROUND_LEFT'), undefined, group.roundLeft.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}>
        <primitive object={activeMaterial} attach="material" /></instancedMesh>
      <instancedMesh ref={(el) => { refs.current.roundRight = el! }} args={[getGeo('ROUND_RIGHT'), undefined, group.roundRight.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}>
        <primitive object={activeMaterial} attach="material" /></instancedMesh>
      <instancedMesh ref={(el) => { refs.current.roundTop = el! }} args={[getGeo('ROUND_TOP'), undefined, group.roundTop.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}>
        <primitive object={activeMaterial} attach="material" /></instancedMesh>
      <instancedMesh ref={(el) => { refs.current.roundBottom = el! }} args={[getGeo('ROUND_BOTTOM'), undefined, group.roundBottom.length]} onClick={onClick} onContextMenu={onContext} frustumCulled={false}>
        <primitive object={activeMaterial} attach="material" /></instancedMesh>
        <instancedMesh
          ref={(el) => { refs.current.props = el! }}
          args={[getGeo('PROP'), undefined, group.props.length]}
          onClick={onClick} onContextMenu={onContext}
          frustumCulled={false}
        >
          <primitive object={activeMaterial} attach="material" />
        </instancedMesh>
    </group>
  );
};

// ==========================================
// 3. COMPONENTE PRINCIPAL: CHUNK
// ==========================================

export function Chunk({ data, variations, position, chunkSize }: ChunkProps) {
  const createTerrain = useTerrainStore(state => state.createTerrain);
  const destroyTerrain = useTerrainStore(state => state.destroyTerrain);
  const brushSize = useTerrainStore(state => state.brushSize);
  const selectedMaterialId = useTerrainStore(state => state.selectedMaterialId);
  const getGlobalVoxel = useTerrainStore(state => state.getVoxel);

  // 1. CARGAR ASSETS
  const { nodes: grassNodes } = useGLTF('/models/cubes/grass/GrassCubes_set.glb') as any;
  const { nodes: baseNodes } = useGLTF('/models/cubes/base/BaseCubes_set.glb') as any;
  // Nota: Si aún no tienes el MegaAtlas.png listo, usa null o una textura placeholder
  const textureAtlas = useTexture('/models/cubes/MegaAtlas.png');
  //const textureAtlas = null; 

  useMemo(() => {
    if (textureAtlas) {
      textureAtlas.flipY = false;
      textureAtlas.magFilter = THREE.NearestFilter;
      textureAtlas.minFilter = THREE.NearestMipMapLinearFilter;
      textureAtlas.colorSpace = THREE.SRGBColorSpace;
      textureAtlas.generateMipmaps = true;
      textureAtlas.anisotropy = 16;
      textureAtlas.needsUpdate = true;
    }
  }, [textureAtlas]);

  // 2. CONFIGURAR MATERIAL DE PASTO
  const grassMaterial = useMemo(() => {
    textureAtlas.flipY = false;

    // Configuración Pixel Art 
    textureAtlas.magFilter = THREE.NearestFilter;
    textureAtlas.minFilter = THREE.NearestFilter;
    textureAtlas.colorSpace = THREE.SRGBColorSpace;
    textureAtlas.needsUpdate = true; // Aseguramos que Three.js procese el cambio

    const mat = new THREE.MeshStandardMaterial({
      map: textureAtlas,
      vertexColors: true,
      roughness: 1,
      transparent: true,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });
    // Inyectamos el shader
    mat.onBeforeCompile = patchSolidGrassMaterial; // Usamos el parche SIN viento
    mat.customProgramCacheKey = () => 'solid_grass_v2';
    return mat;
  }, [textureAtlas]);


  // Helper functions
  const addFace = (geo: THREE.BufferGeometry, x: number, y: number, z: number, rot: number, axis: 'x' | 'y', target: THREE.BufferGeometry[]) => {
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
    const groups: Record<string, RenderGroup> = {};
    const dummy = new THREE.Object3D();
    const MODEL_SCALE = 1;

    const roundShapesMap: Record<string, keyof RenderGroup> = {
      'ROUND_FULL': 'roundFull',
      'ROUND_LEFT': 'roundLeft',
      'ROUND_RIGHT': 'roundRight',
      'ROUND_TOP': 'roundTop',
      'ROUND_BOTTOM': 'roundBottom'
    };

    const addSolidCollider = (x: number, y: number, z: number, target: THREE.BufferGeometry[]) => {
      addFace(planePhys, x, y + 0.5, z, -Math.PI / 2, 'x', target);
      addFace(planePhys, x, y - 0.5, z, Math.PI / 2, 'x', target);
      addFace(planePhys, x - 0.5, y, z, Math.PI / 2, 'y', target);
      addFace(planePhys, x + 0.5, y, z, -Math.PI / 2, 'y', target);
    };

    const isSolidGlobal = (lx: number, ly: number, lz: number) => {
      const wx = position[0] + lx;
      const wy = position[1] + ly;
      const wz = position[2] + lz;
      const neighborId = getGlobalVoxel(wx, wy, wz);

      if (neighborId === 0) return false;
      const matDef = MATERIALS_DB[neighborId];
      if (matDef?.type === 'PROP') return false;
      return true;
    };
    const getMaterial = (index: number) => data[index];
    const getVariation = (index: number) => variations ? variations[index] : 0;

    for (let z = 0; z < chunkSize; z++) {
      for (let y = 0; y < chunkSize; y++) {
        for (let x = 0; x < chunkSize; x++) {
          const index = z * chunkSize * chunkSize + y * chunkSize + x;
          let matId = getMaterial(index);
          if (matId === 0) continue;

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
          const matDef = MATERIALS_DB[matId];
          const isProp = matDef?.type === 'PROP';
          if (!isProp && top && bottom && left && right && front && back) continue;

          dummy.position.set(x, y, z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);

          if (matId === 5 && top) {
            matId = 1;
          }

          const varId = getVariation(index);
          // Creamos la clave compuesta
          const groupKey = `${matId}_${varId}`;
          if (!groups[groupKey]) {
            groups[groupKey] = {
              cubes: [], ramps: [], traps: [], rampsDown: [], trapsDown: [],
              roundFull: [], roundLeft: [], roundRight: [], roundTop: [], roundBottom: [], props: []
            };
          }

          let shapeType = 'CUBE';

          // ==========================================
          // LÓGICA DE DECISIÓN DE FORMA
          // ==========================================
          // 1. SUPERFICIE (Aire Arriba)
          // Si hay aire tanto arriba como abajo -> mantener CUBE
          if (isProp) {
            shapeType = 'PROP';
          } else {
            if (!top && !bottom) {
              if (!left && !right) {
                shapeType = 'ROUND_FULL'; // Isla solitaria
              } else if (!left && right) {
                shapeType = 'ROUND_LEFT'; // Inicio plataforma
                dummy.rotation.y = Math.PI; // Girar 180° para que el lado plano quede a la izquierda
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
                dummy.rotation.z = Math.PI;
                dummy.rotation.y = Math.PI;
              }
              // CASO A: TECHO BAJANDO A DERECHA (Tierra Izq, Aire Der)
              if (left && !right) {
                // Miramos la diagonal inferior izquierda
                if (bottomLeft) {
                  shapeType = 'RAMP_DOWN'; // Escalera de techo
                  //dummy.rotation.x = Math.PI;
                  dummy.rotation.y = Math.PI;
                } else {
                  shapeType = 'TRAP_DOWN'; // Borde suave de techo
                  //dummy.rotation.x = Math.PI;
                  dummy.rotation.y = Math.PI;
                }
              }

              // CASO B: TECHO BAJANDO A IZQUIERDA (Aire Izq, Tierra Der)
              else if (!left && right) {
                if (bottomRight) {
                  shapeType = 'RAMP_DOWN'; // Escalera de techo
                  //dummy.rotation.x = Math.PI;
                  dummy.rotation.y = 0;
                } else {
                  shapeType = 'TRAP_DOWN';
                  //dummy.rotation.x = Math.PI;
                  dummy.rotation.y = 0;
                }
              }
            }
            // 3. COLUMNA SUPERIOR (Aire Arriba, Suelo Abajo, Sin lados)
            // Esto arregla el "Pilar" que querías redondeado arriba
            else if (shapeType === 'CUBE' && !top && bottom && !left && !right) {
              shapeType = 'ROUND_TOP';
              dummy.rotation.z = 0; // Girar para que la parte redondeada quede arriba
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
          }
          dummy.updateMatrix();

          // 3. ASIGNACIÓN A ARRAYS
          if (shapeType === 'PROP') {
            groups[groupKey].props.push(dummy.matrix.clone());
          }
          else if (shapeType === 'RAMP') {
            groups[groupKey].ramps.push(dummy.matrix.clone());

            const g = rampGeoPhys.clone();
            g.applyMatrix4(dummy.matrix);
            geometriesToMerge.push(g);
          }
          else if (shapeType === 'TRAP') {
            groups[groupKey].traps.push(dummy.matrix.clone());

            const g = trapGeoPhys.clone();
            g.applyMatrix4(dummy.matrix);
            geometriesToMerge.push(g);
          }
          else if (shapeType === 'RAMP_DOWN') {
            groups[groupKey].rampsDown.push(dummy.matrix.clone());
            const g = rampDownGeoPhys.clone();
            g.applyMatrix4(dummy.matrix);
            geometriesToMerge.push(g);
          }
          else if (shapeType === 'TRAP_DOWN') {
            groups[groupKey].trapsDown.push(dummy.matrix.clone());
            const g = trapDownGeoPhys.clone();
            g.applyMatrix4(dummy.matrix);
            geometriesToMerge.push(g);
          }
          else if (roundShapesMap[shapeType]) {
            const groupName = roundShapesMap[shapeType];
            groups[groupKey][groupName].push(dummy.matrix.clone());

            addSolidCollider(x, y, z, geometriesToMerge);
          }
          else {
            // CUBE
            groups[groupKey].cubes.push(dummy.matrix.clone());
            if (!top) addFace(planePhys, x, y + 0.5, z, -Math.PI / 2, 'x', geometriesToMerge);
            if (!bottom) addFace(planePhys, x, y - 0.5, z, Math.PI / 2, 'x', geometriesToMerge);
            if (!left) addFace(planePhys, x - 0.5, y, z, Math.PI / 2, 'y', geometriesToMerge);
            if (!right) addFace(planePhys, x + 0.5, y, z, -Math.PI / 2, 'y', geometriesToMerge);
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
      } catch (e) { console.error(e); }
    }

    return {
      renderGroups: groups,
      physicsData: { vertices: finalVertices, indices: finalIndices }
    };

  }, [position, getGlobalVoxel, data, variations, chunkSize]);



  // Handlers 
  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!e.face) return;
    const newPos = new THREE.Vector3().copy(e.point).add(e.face.normal.clone().multiplyScalar(0.5));
    createTerrain(newPos.x, newPos.y, brushSize, selectedMaterialId);
  };
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

      {Object.keys(renderGroups).map((key) => (
        <ChunkLayer
          key={key}
          groupKey={key}
          group={renderGroups[key]}
          onClick={handleClick}
          onContext={handleContext}
          baseNodes={baseNodes}
          grassNodes={grassNodes}
          grassMaterial={grassMaterial}
          baseTexture={textureAtlas}
        />
      ))}
    </RigidBody>
  );
}