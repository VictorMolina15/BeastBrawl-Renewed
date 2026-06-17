import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { SingularityShader } from '../../shaders/singularityShader'; // Ajusta la ruta

export function Singularity({ mainCamera, z = -45, scale = 40 }: { mainCamera: THREE.Camera, z?: number, scale?: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const texture = useTexture('/bg/the_void/black_hole.png');

  const materialArgs = useMemo(() => {
    // Forzamos el espacio de color y evitamos que los bordes de la imagen se repitan
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    const m = {
      ...SingularityShader,
      uniforms: THREE.UniformsUtils.clone(SingularityShader.uniforms)
    };
    (m.uniforms.uTexture.value as unknown as THREE.Texture) = texture;
    return m;
  }, [texture]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const material = meshRef.current.material as THREE.ShaderMaterial;
    // Actualizamos el tiempo para que gire
    material.uniforms.uTime.value = state.clock.getElapsedTime();

    // Parallax Leve: El agujero negro casi no se mueve para dar sensación de lejanía colosal
    meshRef.current.position.x = mainCamera.position.x ; 
    meshRef.current.position.y = mainCamera.position.y ;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, z]}>
      {/* Al ser tu imagen cuadrada, el plano base debe ser un cuadrado perfecto */}
      <planeGeometry args={[scale, scale]} />
      <shaderMaterial 
        args={[materialArgs]} 
        transparent={true} 
        depthTest={false}
        toneMapped={false}
        premultipliedAlpha={false}
      />
    </mesh>
  );
}