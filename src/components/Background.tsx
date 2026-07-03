// src/components/Background.tsx
import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import { useTexture, useGLTF, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { BIOMES_CONFIG, type BackgroundLayer } from '../config/backgrounds';
import { useTerrainStore } from '../stores/useTerrainStore';
import { VoidShader } from '../shaders/voidShader';
import { VoidDecorations } from './decorations/VoidDecoration';
import { Singularity } from './decorations/Singularity';

export function AnimatedLayer({ layer, mainCamera }: { layer: BackgroundLayer, mainCamera: THREE.Camera }) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const texture = useTexture(layer.texturePath);

    const columns = layer.columns || 1;
    const rows = layer.rows || 1;

    texture.colorSpace = THREE.SRGBColorSpace; 
    texture.needsUpdate = true;

    useMemo(() => {
        texture.repeat.set(1 / columns, 1 / rows);
        texture.magFilter = THREE.NearestFilter;
        texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    }, [texture, columns, rows]);

    useFrame((state) => {
        if (!meshRef.current) return;

        const totalFrames = layer.frames || 1;
        const fps = layer.fps || 12;
        const currentFrame = Math.floor(state.clock.getElapsedTime() * fps) % totalFrames;

        const col = currentFrame % columns;
        const row = Math.floor(currentFrame / columns);

        texture.offset.x = col / columns;
        texture.offset.y = 1 - (1 / rows) - (row / rows);

        // Posicionamiento original relativo a la cámara principal
        meshRef.current.position.x = mainCamera.position.x + (layer.xPos || 0);
        meshRef.current.position.y = mainCamera.position.y + (layer.yOffset || 0);
    }, -1);

    return (
        <mesh ref={meshRef} position={[0, 0, layer.z]}>
            <planeGeometry args={layer.scale || [10, 10]} />
            <meshBasicMaterial map={texture} transparent depthTest={false} toneMapped={false}/>
        </mesh>
    );
}

function Layer2D({ layer, camera }: { layer: BackgroundLayer, camera: THREE.Camera }) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const texture = useTexture(layer.texturePath);

    texture.wrapS = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;

    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.position.x = camera.position.x;
            meshRef.current.position.y = camera.position.y + (layer.yOffset || 0);
            texture.offset.x = camera.position.x * layer.speed;
        }
    });

    return (
        <mesh ref={meshRef} position={[0, 0, layer.z]}>
            <planeGeometry args={layer.scale || [100, 50]} />
            <meshBasicMaterial
                map={texture}
                transparent
                opacity={layer.opacity ?? 1}
                depthWrite={false}
                toneMapped={false}
            />
        </mesh>
    );
}

function Layer3D({ layer, camera }: { layer: BackgroundLayer, camera: THREE.Camera }) {
    const groupRef = useRef<THREE.Group>(null!);
    const { scene } = useGLTF(layer.texturePath);
    const clonedScene = scene.clone();

    useFrame(() => {
        if (groupRef.current) {
            groupRef.current.position.x = camera.position.x * (1 - layer.speed);
            groupRef.current.position.y = camera.position.y + (layer.yOffset || 0);
        }
    });

    return (
        <primitive
            ref={groupRef}
            object={clonedScene}
            position={[0, 0, layer.z]}
            scale={layer.scale ? [layer.scale[0], layer.scale[1], layer.scale[0]] : [1, 1, 1]}
        />
    );
}

function FluidLayer({ layer, mainCamera }: { layer: BackgroundLayer, mainCamera: THREE.Camera }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const texture = useTexture(layer.texturePath);
  
  const materialArgs = useMemo(() => {
    const m = JSON.parse(JSON.stringify(VoidShader));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    m.uniforms.uTexture.value = texture;
    return m;
  }, [texture]);

  useFrame((state) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.getElapsedTime();
      meshRef.current.position.x = mainCamera.position.x;
      meshRef.current.position.y = mainCamera.position.y + (layer.yOffset || 0);
      texture.offset.x = mainCamera.position.x * layer.speed;
    }
  }, -1);

  return (
    <mesh ref={meshRef} position={[0, 0, layer.z]}>
      <planeGeometry args={layer.scale || [100, 50]} />
      <shaderMaterial 
        args={[materialArgs]} 
        transparent 
        toneMapped={false} 
        depthTest={false}
      />
    </mesh>
  );
}

export function Background() {
    const { camera: mainCamera } = useThree();
    const biome = useTerrainStore(state => state.currentBiome);
    const layers = BIOMES_CONFIG[biome] || [];

    const bgScene = useMemo(() => new THREE.Scene(), []);
    const bgCameraRef = useRef<THREE.OrthographicCamera>(null!);

    // Buffer fuera de pantalla para capturar el fondo
    const target = useMemo(() => {
        return new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.HalfFloatType
        });
    }, []);

    // Limpieza de memoria al desmontar
    useEffect(() => {
        return () => target.dispose();
    }, [target]);

    useFrame((state) => {
        if (!bgCameraRef.current) return;

        // Adaptación dinámica de tamaño ante cambios de ventana
        if (target.width !== state.size.width || target.height !== state.size.height) {
            target.setSize(state.size.width, state.size.height);
        }

        bgCameraRef.current.position.x = mainCamera.position.x;
        bgCameraRef.current.position.y = mainCamera.position.y;

        if (mainCamera instanceof THREE.OrthographicCamera) {
            bgCameraRef.current.zoom = 6 + (mainCamera.zoom * 0.3);
        } else if (mainCamera instanceof THREE.PerspectiveCamera) {
            const zDiff = mainCamera.position.z - 80;
            bgCameraRef.current.zoom = 10 - (zDiff * 0.05);
        }

        bgCameraRef.current.updateProjectionMatrix();

        

        // Redirección del renderizador hacia el RenderTarget
        const prevTarget = state.gl.getRenderTarget();
        const prevTone = state.gl.toneMapping; 

        state.gl.setRenderTarget(target);
        state.gl.clear();
        state.gl.toneMapping = THREE.NoToneMapping; 
        
        state.gl.render(bgScene, bgCameraRef.current);
        
        state.gl.toneMapping = prevTone;
        state.gl.setRenderTarget(prevTarget);

        // Se inyecta la textura al fondo nativo de la escena principal
        state.scene.background = target.texture;
    });

    return createPortal(
        <group>
            <OrthographicCamera
                ref={bgCameraRef}
                makeDefault={false}
                position={[0, 0, 100]}
                zoom={10}
            />
            <ambientLight intensity={1.5} />

            {layers.map((layer) => {
                if (layer.isSprite) return <AnimatedLayer key={layer.id} layer={layer} mainCamera={mainCamera} />; 
                if (layer.isFluid) return <FluidLayer key={layer.id} layer={layer} mainCamera={mainCamera} />;
                return layer.is3D ? (
                    <Layer3D key={layer.id} layer={layer} camera={mainCamera} />
                ) : (
                    <Layer2D key={layer.id} layer={layer} camera={mainCamera} />
                );
            })}

            {biome === 'THE_VOID' && (
                <>
                <VoidDecorations mainCamera={mainCamera} />
                <Singularity mainCamera={mainCamera} />
                </>
            )}
        </group>,
        bgScene
    );
}