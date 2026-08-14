import { RigidBody, RapierRigidBody, BallCollider, interactionGroups } from '@react-three/rapier';
import { useRef, useEffect } from 'react';
import { useTerrainStore } from '../../stores/useTerrainStore';
import { type WeaponId, WEAPONS_DB } from '../../stores/useCombatStore';
import * as THREE from 'three';

interface ProjectileProps {
  id: string;
  weaponId: WeaponId;
  startPosition: [number, number, number];
  velocity: [number, number, number];
  onDestroyed: (id: string) => void;
}

export function Projectile({ id, weaponId, startPosition, velocity, onDestroyed }: ProjectileProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const damageTerrain = useTerrainStore((state) => state.damageTerrain);
  const weaponStats = WEAPONS_DB[weaponId];
  
  // Evitar múltiples detonaciones por rebotes rápidos
  const hasExploded = useRef(false);

  useEffect(() => {
    if (rigidBodyRef.current) {
      // Aplicar el impulso inicial al nacer
      rigidBodyRef.current.setLinvel(new THREE.Vector3(...velocity), true);
    }
  }, [velocity]);

  const handleCollision = () => {
    if (hasExploded.current) return;
    hasExploded.current = true;

    if (rigidBodyRef.current) {
      const pos = rigidBodyRef.current.translation();
      // Detonar terreno (x, y, radio, daño)
      damageTerrain(pos.x, pos.y, weaponStats.blastRadius, weaponStats.damage);
    }
    
    // Autodestruir el componente para liberar memoria
    onDestroyed(id);
  };

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={startPosition}
      colliders={false}
      collisionGroups={interactionGroups(2, [0])}
      ccd={true} 
      onIntersectionEnter={handleCollision}
      onCollisionEnter={handleCollision}
      gravityScale={weaponId === 'RPG' ? 0.2 : 1} // El RPG cae más lento (casi en línea recta)
    >
      <BallCollider args={[0.2]} />
      <mesh>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial 
          color={weaponId === 'RPG' ? "#ff3333" : "#333333"} 
          emissive={weaponId === 'RPG' ? "#ff0000" : "#000000"}
          emissiveIntensity={2}
        />
      </mesh>
    </RigidBody>
  );
}