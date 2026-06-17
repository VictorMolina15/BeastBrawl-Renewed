import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

// 1. COMPONENTE ESTRELLA INDIVIDUAL
interface StarLayer {
  texturePath: string;
  columns: number;
  rows: number;
  fps: number;
  delay: number;
  frames: number;
  x: number;
  y: number;
  z: number;
  scale: number;
}

function RespawningStar({ layer, mainCamera }: { layer: StarLayer, mainCamera: THREE.Camera }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null!);
  
  // 1. Cargamos la textura base (compartida por todas para ahorrar memoria)
  const baseTexture = useTexture(layer.texturePath);

  // 2. LA SOLUCIÓN: Clonamos la textura para que esta estrella tenga su propio offset
  const texture = useMemo(() => {
    const tex = baseTexture.clone(); 
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(1 / layer.columns, 1 / layer.rows);
    tex.magFilter = THREE.NearestFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true; 
    return tex;
  }, [baseTexture, layer.columns, layer.rows]);

  const animDuration = layer.frames / layer.fps;

  const starState = useRef({
    x: layer.x,
    y: layer.y,
    cycleLength: animDuration + 1.0 + (Math.random() * 3.0), 
    lastLocalTime: 0
  });
  useMemo(() => {
    const tex = texture as THREE.Texture;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(1 / layer.columns, 1 / layer.rows);
    tex.magFilter = THREE.NearestFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  }, [texture, layer.columns, layer.rows]);

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.getElapsedTime();
    const localTime = (time + layer.delay) % starState.current.cycleLength;

    if (localTime < starState.current.lastLocalTime) {
      starState.current.x = (Math.random() - 0.5) * 200;
      starState.current.y = (Math.random() - 0.5) * 100;
      meshRef.current.rotation.z = Math.random() * Math.PI * 2; 
    }
    starState.current.lastLocalTime = localTime;

    // 3. Usamos la duración real calculada en lugar del '1.0' fijo
    if (localTime <= animDuration) {
      materialRef.current.opacity = 1; 
      
      // 4. Usamos los FPS individuales de esta estrella
      const currentFrame = Math.floor(localTime * layer.fps); 
      const frameToPlay = Math.min(currentFrame, layer.frames - 1); 
      
      const col = frameToPlay % layer.columns;
      const row = Math.floor(frameToPlay / layer.columns);
      texture.offset.x = col / layer.columns;
      texture.offset.y = 1 - (1 / layer.rows) - (row / layer.rows);
    } else {
      materialRef.current.opacity = 0;
    }

    meshRef.current.position.x = mainCamera.position.x + starState.current.x;
    meshRef.current.position.y = mainCamera.position.y + starState.current.y;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, layer.z]} scale={[layer.scale, layer.scale, 1]}>
      {/* Al ser un Sprite 1:1, el plano base siempre es cuadrado */}
      <planeGeometry args={[10, 10]} /> 
      <meshBasicMaterial 
        ref={materialRef}
        map={texture} 
        transparent 
        depthTest={false} 
        toneMapped={false} 
      />
    </mesh>
  );
}

// 2. EL DECORADOR PRINCIPAL
export function VoidDecorations({ mainCamera }: { mainCamera: THREE.Camera }) {
  // Generamos nuestra "Piscina" de estrellas
  const stars = useMemo(() => {
    const starList = [];
    const totalStars = 10 + Math.floor(Math.random() * 20); // Entre 10 y 30 estrellas
    
    for (let i = 0; i < totalStars; i++) {
      starList.push({
        id: `star-pool-${i}`,
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 100,
        z: -35 - Math.random() * 20,
        scale: 0.5 + Math.random() * 0.02,
        fps: 24 + Math.floor(Math.random() * 8),
        delay: Math.random() * 3, // Un delay inicial aleatorio en segundos
        texturePath: '/bg/the_void/star.png', // Ajusta a tu ruta
        frames: 43, columns: 7, rows: 7 // Ajusta a las medidas de tu Sprite
      });
    }
    return starList;
  }, []);

  return (
    <>
      {stars.map((star) => (
        <RespawningStar key={star.id} layer={star} mainCamera={mainCamera} />
      ))}
    </>
  );
}