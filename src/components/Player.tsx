import { useKeyboardControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, CoefficientCombineRule, RapierCollider, RapierRigidBody, RigidBody, useRapier } from '@react-three/rapier';
import { useEffect, useRef, useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { type ControlActions, Controls } from '../main';

const MOVE_SPEED = 8;
const JUMP_FORCE = 8;

export function Player() {
  const rigidBodyRef = useRef<RapierRigidBody>(null!);
  const playerColliderRef = useRef<RapierCollider>(null!);
  const [isGrounded, setIsGrounded] = useState(false);
  const canJumpRef = useRef(true);

  const { rapier, world } = useRapier();
  // CORRECCIÓN SUTIL: `subscribe` no se estaba usando, así que lo quito para evitar errores de linting.
  // Si lo necesitaras para otra cosa (como un efecto de partículas al saltar), lo volverías a añadir.
  const getControls = useKeyboardControls<ControlActions>()[1];

  useFrame(() => {
    if (!rigidBodyRef.current || !playerColliderRef.current) return;

    // La lógica de Ground-Check es correcta.
    const origin = rigidBodyRef.current.translation();
    origin.y -= 0.75;
    const direction = { x: 0, y: -1, z: 0 };
    const ray = new rapier.Ray(origin, direction);
    const hit = world.castRayAndGetNormal(ray, 0.5, true, undefined, undefined, playerColliderRef.current);
    
    // Tu versión de esta comprobación era más segura, la adopto.
    if (hit && hit.normal && hit.normal.y > 0.7) {
      if (!isGrounded) setIsGrounded(true);
      canJumpRef.current = true;
    } else {
      if (isGrounded) setIsGrounded(false);
    }
    
    // La lógica de movimiento y salto es correcta.
    const { left, right, jump } = getControls();
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
      position={[0, 5, 0]}
      ccd={true} // continuous collision detection
    >
      <CapsuleCollider 
        ref={playerColliderRef} 
        args={[0.75, 0.5]} 
        friction={0}
        restitution={0}
      />
      <mesh>
        <capsuleGeometry args={[0.5, 0.75, 4, 8]} />
        <meshStandardMaterial color="royalblue" />
      </mesh>
    </RigidBody>
  );
}