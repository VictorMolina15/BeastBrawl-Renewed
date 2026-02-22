import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, CoefficientCombineRule, RapierCollider, RapierRigidBody, RigidBody, useRapier } from '@react-three/rapier';
import { useEffect, useRef, useState } from 'react';
import { useInputStore } from '../stores/useInputStore'; // <--- IMPORTAMOS TU STORE

const MOVE_SPEED = 5;
const JUMP_FORCE = 12;

export function Player() {
  const rigidBodyRef = useRef<RapierRigidBody>(null!);
  const playerColliderRef = useRef<RapierCollider>(null!);
  const [isGrounded, setIsGrounded] = useState(false);
  const canJumpRef = useRef(true);

 const { world, rapier } = useRapier();

  // NOTA: Ya no necesitamos useKeyboardControls. 
  // Leeremos el estado directamente en el loop de física.

  useFrame(() => {
    if (!rigidBodyRef.current || !playerColliderRef.current) return;

    // 1. GROUND CHECK (Mantenemos tu lógica, funciona bien)
    const origin = rigidBodyRef.current.translation();
    origin.y -= 0.75;
    const direction = { x: 0, y: -1, z: 0 };
    const ray = new rapier.Ray(origin, direction);
    const hit = world.castRayAndGetNormal(ray, 0.5, true, undefined, undefined, playerColliderRef.current);
    
    if (hit && hit.normal && hit.normal.y > 0.7) {
      if (!isGrounded) setIsGrounded(true);
      canJumpRef.current = true;
    } else {
      if (isGrounded) setIsGrounded(false);
    }
    
    // 2. INPUTS (NUEVO SISTEMA)
    // Usamos .getState() para leer los inputs sin provocar re-renders en React
    const actions = useInputStore.getState().activeActions;
    
    const left = actions['MOVE_LEFT'];
    const right = actions['MOVE_RIGHT'];
    const jump = actions['JUMP'];

    // 3. FÍSICAS
    const linvel = rigidBodyRef.current.linvel();
    
    if (right) linvel.x = MOVE_SPEED;
    else if (left) linvel.x = -MOVE_SPEED;
    else linvel.x = 0;
    
    rigidBodyRef.current.setLinvel({ x: linvel.x, y: linvel.y, z: 0 }, true);

    if (jump && isGrounded && canJumpRef.current) {
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
        <capsuleGeometry args={[0.5, 0.50 * 2, 4, 8]} />
        <meshStandardMaterial color="royalblue" />
      </mesh>
    </RigidBody>
  );
}