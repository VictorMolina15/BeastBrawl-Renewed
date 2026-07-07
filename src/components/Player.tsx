import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, CoefficientCombineRule, RapierCollider, RapierRigidBody, RigidBody, useRapier } from '@react-three/rapier';
import { useEffect, useRef, useMemo } from 'react';
import { useInputStore } from '../stores/useInputStore';
import { Outlines } from '@react-three/drei'; // <-- IMPORTAMOS OUTLINES
import * as THREE from 'three';

const MOVE_SPEED = 5;
const JUMP_FORCE = 12;

export function Player() {
  const rigidBodyRef = useRef<RapierRigidBody>(null!);
  const playerColliderRef = useRef<RapierCollider>(null!);
  const isGroundedRef = useRef(false);
  const canJumpRef = useRef(true);
  const { world, rapier } = useRapier();

  // --- 1. GENERADOR DE CEL SHADING (GRADIENT MAP) ---
  const toonTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 3; 
    canvas.height = 1;
    const context = canvas.getContext('2d')!;
    
    // Dibujamos 3 franjas de luz: Sombra, Tono medio, Luz brillante
    context.fillStyle = '#444444'; context.fillRect(0, 0, 1, 1);
    context.fillStyle = '#888888'; context.fillRect(1, 0, 1, 1);
    context.fillStyle = '#ffffff'; context.fillRect(2, 0, 1, 1);
    
    const texture = new THREE.CanvasTexture(canvas);
    // NearestFilter asegura que el corte de luz sea DURO (estilo anime)
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }, []);

  useFrame(() => {
    if (!rigidBodyRef.current || !playerColliderRef.current) return;
    
    const origin = rigidBodyRef.current.translation();
    origin.y -= 0.75;
    const direction = { x: 0, y: -1, z: 0 };
    const ray = new rapier.Ray(origin, direction);
    const hit = world.castRayAndGetNormal(ray, 0.5, true, undefined, undefined, playerColliderRef.current);
    
    if (hit && hit.normal && hit.normal.y > 0.7) {
      isGroundedRef.current = true;
      canJumpRef.current = true;
    } else {
      isGroundedRef.current = false;
    }
    
    const actions = useInputStore.getState().activeActions;
    const left = actions['MOVE_LEFT'];
    const right = actions['MOVE_RIGHT'];
    const jump = actions['JUMP'];
    
    const linvel = rigidBodyRef.current.linvel();
    
    if (right) linvel.x = MOVE_SPEED;
    else if (left) linvel.x = -MOVE_SPEED;
    else linvel.x = 0;
    
    rigidBodyRef.current.setLinvel({ x: linvel.x, y: linvel.y, z: 0 }, true);
    if (jump && isGroundedRef.current && canJumpRef.current) {
      rigidBodyRef.current.setLinvel({ x: linvel.x, y: 0, z: linvel.z }, true);
      rigidBodyRef.current.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
      canJumpRef.current = false;
    }
  });

  useEffect(() => {
    const rigidBody = rigidBodyRef.current;
    if (rigidBody) {
      const collider = rigidBody.collider(0);
      playerColliderRef.current = collider;
      collider.setFrictionCombineRule(CoefficientCombineRule.Multiply);
      collider.setRestitutionCombineRule(CoefficientCombineRule.Multiply);
    }
  }, []);

  return (
    <RigidBody
      ref={rigidBodyRef}
      colliders={false}
      mass={1}
      lockRotations
      position={[0, 75, 0]}
      ccd={true} 
      enabledTranslations={[true, true, false]}
    >
      <CapsuleCollider 
        ref={playerColliderRef} 
        args={[0.5, 0.50]} 
        friction={0}
        restitution={0}
      />
      <mesh>
        {/* Aumentamos un pelín los segmentos para que el outline negro no se vea picudo */}
        <capsuleGeometry args={[0.5, 0.50 * 2, 8, 16]} />
        
        {/* 2. APLICAMOS EL MATERIAL TOON */}
        <meshToonMaterial 
            color="royalblue" 
            gradientMap={toonTexture} 
        />
        
        {/* 3. EL BORDE NEGRO (Inverted Hull) */}
        <Outlines thickness={2} color="black" />
      </mesh>
    </RigidBody>
  );
}