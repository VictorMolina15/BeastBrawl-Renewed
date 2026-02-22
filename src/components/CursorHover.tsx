import { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF, useTexture } from '@react-three/drei';
import { MATERIALS_DB, ATLAS_CONFIG } from '../config/materials';
import { useTerrainStore } from '../stores/useTerrainStore';

// Precarga de assets
useGLTF.preload('/models/cubes/grass/GrassCubes_set.glb');
useGLTF.preload('/models/cubes/base/BaseCubes_set.glb');

interface CursorProps {
  position: [number, number, number];
  visible: boolean;
}

interface GrassNodes {
  CubeGrass?: {
    geometry: THREE.BufferGeometry;
  };
}

interface BaseNodes {
  CubeBase?: {
    geometry: THREE.BufferGeometry;
  };
}

export function Cursor({ position, visible }: CursorProps) {
  const selectedMaterialId = useTerrainStore(state => state.selectedMaterialId);
  const selectedVariationId = useTerrainStore(state => state.selectedVariationId);
  
  // Assets
  const { nodes: grassNodes } = useGLTF('/models/cubes/grass/GrassCubes_set.glb') as { nodes: GrassNodes };
  const { nodes: baseNodes } = useGLTF('/models/cubes/base/BaseCubes_set.glb') as { nodes: BaseNodes };
  const textureAtlas = useTexture('/models/cubes/MegaAtlas.png');
  
  const meshRef = useRef<THREE.Mesh>(null);

  // Datos del material seleccionado
  const materialDef = MATERIALS_DB[selectedMaterialId];
  const isGrass = materialDef?.type === 'GRASS';
  const isProp = materialDef?.type === 'PROP';

  const boxGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const propGeometry = useMemo(() => {
      const geo = new THREE.PlaneGeometry(1, 1);
      const uvAttr = geo.attributes.uv;
      if (uvAttr) {
          for (let i = 0; i < uvAttr.count; i++) {
              uvAttr.setY(i, 1 - uvAttr.getY(i));
          }
      }
      return geo;
  }, []);

 const cursorGeometry = useMemo(() => {
      if (isGrass) return grassNodes.CubeGrass?.geometry || boxGeometry;
      if (isProp) return propGeometry;
      return baseNodes.CubeBase?.geometry || boxGeometry;
  }, [isGrass, isProp, grassNodes, baseNodes, boxGeometry, propGeometry]);

  // --- CONFIGURACIÓN DEL MATERIAL HÍBRIDO ---
  const cursorMaterial = useMemo(() => {
    if (!materialDef || !textureAtlas) return new THREE.MeshBasicMaterial({ color: 'red', wireframe: true });

    // 1. Configurar Textura
    textureAtlas.flipY = false;
    textureAtlas.magFilter = THREE.NearestFilter;
    textureAtlas.colorSpace = THREE.SRGBColorSpace;
    const texture = textureAtlas.clone();
    texture.needsUpdate = true;

    // Datos de Variación
    const variation = materialDef.variations?.[selectedVariationId];
    
    // PRIORIDAD: ¿Variación tiene Atlas? -> Sino, Material Base.
    const effectiveAtlasPos = variation?.atlasPos || materialDef.atlasPos;
    
    // PRIORIDAD: ¿Variación tiene Color? -> Sino, Material Base.
    let targetColorHex = variation ? variation.color : materialDef.color;
    const targetColor = new THREE.Color(targetColorHex);

    // 2. Offset para Bloques BASE
    const cols = ATLAS_CONFIG.cols;
    const rows = ATLAS_CONFIG.rows;
    const EPSILON = 0.0016;

    if (!isGrass && effectiveAtlasPos) {
      texture.repeat.set((1 / cols) - (2 * EPSILON), (1 / rows) - (2 * EPSILON));
      texture.offset.x = (effectiveAtlasPos.x / cols) + EPSILON;
      texture.offset.y = (effectiveAtlasPos.y / rows) + EPSILON;
    }

    // 3. Color Objetivo (Variación)
    if (materialDef.variations?.[selectedVariationId]) {
        targetColorHex = materialDef.variations[selectedVariationId].color;
    }

    // 4. Crear Material Base (Blanco y Transparente)
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      color: 'white', 
      transparent: true,
      opacity: 0.9,
      roughness: 1,
      alphaTest: 0.5,
      vertexColors: isGrass, // Solo activamos vertex colors si es pasto
      side: isGrass ? THREE.DoubleSide : THREE.FrontSide,
    });

    // 5. INYECTAR MINI-SHADER (Solo para Pasto)
    if (isGrass) {
        // Guardamos el color en userData para pasarlo al shader
        mat.userData.uTint = { value: targetColor };

        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTint = mat.userData.uTint;

            // Vertex Shader: Leer máscara roja
            shader.vertexShader = `
                varying float vMaskVal;
                ${shader.vertexShader}
            `.replace(
                '#include <color_vertex>',
                `#include <color_vertex>
                 vMaskVal = color.r;` // Leemos canal rojo del modelo
            );

            // Fragment Shader: Mezclar (Si máscara=1 usa uTint, Si máscara=0 usa Blanco)
            shader.fragmentShader = `
                uniform vec3 uTint;
                varying float vMaskVal;
                ${shader.fragmentShader}
            `.replace(
                '#include <color_fragment>',
                `
                // Mezclamos: Blanco (Tierra) <--> Color Variación (Pasto)
                vec3 finalTint = mix(vec3(1.0), uTint, vMaskVal);
                diffuseColor.rgb *= finalTint;
                `
            );
        };
        mat.customProgramCacheKey = () => `cursor_grass_${selectedVariationId}`; // Forzar recompilación si cambia color
    } else if (isProp){
        mat.userData.uTint = { value: targetColor };
        
        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTint = mat.userData.uTint;
            
            // Inyección segura
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common> 
                 varying float vMaskVal;`
            );
            shader.vertexShader = shader.vertexShader.replace(
                '#include <color_vertex>',
                `#include <color_vertex> 
                 #ifdef USE_COLOR
                    vMaskVal = color.r; 
                 #else
                    vMaskVal = 1.0;
                 #endif
                 `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common> 
                 uniform vec3 uTint; 
                 varying float vMaskVal;
                 float getSaturation(vec3 c) { return max(max(c.r,c.g),c.b) - min(min(c.r,c.g),c.b); }
                 `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `
                vec4 diffuseColorOriginal = diffuseColor;
                vec3 finalTint = uTint;
                float mixFactor = vMaskVal;

                float saturation = getSaturation(diffuseColorOriginal.rgb);
                mixFactor *= (1.0 - smoothstep(0.0, 0.15, saturation));

                vec3 tinted = diffuseColorOriginal.rgb * finalTint;
                diffuseColor.rgb = mix(diffuseColorOriginal.rgb, tinted, mixFactor);
                diffuseColor.a = diffuseColorOriginal.a;
                `
            );
        };
        // Clave única para recompiilar si cambia Grass <-> Prop
        mat.customProgramCacheKey = () => `cursor_${isProp?'prop':'grass'}_${selectedVariationId}`;
    }

    return mat;

  }, [selectedVariationId, textureAtlas, isGrass, isProp,materialDef]);

  // --- ANIMACIÓN ZOOM  ---
useFrame((state) => {
  if (meshRef.current) {
    const t = state.clock.getElapsedTime();
    // Oscila suavemente entre escala 1.0 y 1.1
    const scale = 1.05 + Math.sin(t * 5) * 0.05; 
    meshRef.current.scale.set(scale, scale, scale);
    meshRef.current.position.y = position[1];
  }
});


  // LayoutEffect para asegurar posición inicial
  useLayoutEffect(() => {
     if(meshRef.current) {
         meshRef.current.position.set(0, 0, 0); // Centrado en el grupo
     }
  }, []);

  if (!visible || !materialDef) return null;

  return (
    <group position={[position[0], 0, position[2]]}>
        <mesh 
            ref={meshRef}
            frustumCulled={false}
            geometry={cursorGeometry}
            material={cursorMaterial}
        />
        
        {/* Marco visual opcional */}
        <lineSegments position={[0, position[1], 0.1]}>
             <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
             <lineBasicMaterial color="white" opacity={0.8} transparent />
        </lineSegments>
    </group>
  );
}