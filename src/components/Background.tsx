import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

export function Background() {
  const { camera } = useThree();
  const layer1 = useRef<THREE.Mesh>(null!); // Cielo
  const layer2 = useRef<THREE.Mesh>(null!); // Montañas

  const [texCielo, texMontanas] = useTexture([
    '/textures/bg/sky.png',
    '/textures/bg/mountains.png'
  ]);

  // Configurar para que la textura se repita infinitamente
  [texCielo, texMontanas].forEach(t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
  });

  useFrame(() => {
    // El secreto del Parallax: mover el OFFSET de la textura
    // según la posición X de la cámara
    const camX = camera.position.x;
    
    // El cielo se mueve muy lento (0.01)
    (layer1.current.material as THREE.MeshBasicMaterial).map!.offset.x = camX * 0.005;
    
    // Las montañas un poco más rápido (0.05)
    (layer2.current.material as THREE.MeshBasicMaterial).map!.offset.x = camX * 0.02;
  });

  return (
    <group>
      {/* Capa 1: Muy lejos */}
      <mesh ref={layer1} position={[0, 30, -50]}>
        <planeGeometry args={[100, 60]} />
        <meshBasicMaterial map={texCielo} transparent />
      </mesh>

      {/* Capa 2: Media distancia */}
      <mesh ref={layer2} position={[0, 20, -30]}>
        <planeGeometry args={[100, 40]} />
        <meshBasicMaterial map={texMontanas} transparent />
      </mesh>
    </group>
  );
}