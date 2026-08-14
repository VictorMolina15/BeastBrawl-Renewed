import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCombatStore } from '../../stores/useCombatStore';
import { Projectile } from './Projectile';
import { RapierRigidBody } from '@react-three/rapier';

interface WeaponSystemProps {
  playerRef: React.RefObject<RapierRigidBody>;
}

interface ActiveProjectile {
  id: string;
  weaponId: 'SLINGSHOT' | 'RPG' | 'MELEE';
  startPosition: [number, number, number];
  velocity: [number, number, number];
}

export function WeaponSystem({ playerRef }: WeaponSystemProps) {
  const { camera, mouse } = useThree();
  const appMode = useCombatStore(state => state.appMode);
  const selectedWeapon = useCombatStore(state => state.selectedWeapon);
  const canUseWeapon = useCombatStore(state => state.canUseWeapon);
  const executeWeaponAction = useCombatStore(state => state.executeWeaponAction);

  const [projectiles, setProjectiles] = useState<ActiveProjectile[]>([]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      // 1. Validaciones iniciales
      if (appMode !== 'COMBAT' || !selectedWeapon || selectedWeapon === 'MELEE') return;
      
      // Ignorar el click si el usuario está tocando la UI (botones)
      if ((e.target as HTMLElement).tagName !== 'CANVAS') return;

      // 2. Validar estamina / cooldowns
      if (canUseWeapon(selectedWeapon)) {
        if (!playerRef.current) return;

        // Descontar coste de arma
        if (executeWeaponAction(selectedWeapon)) {
          
          const playerPos = playerRef.current.translation();
          const pVector = new THREE.Vector3(playerPos.x, playerPos.y + 0.5, playerPos.z);

          // 3. Raycast: Encontrar punto en el mundo 3D (Plano Z=0) basado en el cursor
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, camera);
          const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
          const targetPoint = new THREE.Vector3();
          raycaster.ray.intersectPlane(plane, targetPoint);

          // 4. Calcular dirección y velocidad
          const direction = targetPoint.sub(pVector).normalize();
          const SPAWN_RADIUS = 0.2;
          const spawnPos = pVector.clone().add(direction.clone().multiplyScalar(SPAWN_RADIUS));

          const speed = selectedWeapon === 'RPG' ? 40 : 20; 
          const velocity = direction.multiplyScalar(speed);

          // 5. Instanciar proyectil
          const newProj: ActiveProjectile = {
            id: crypto.randomUUID(),
            weaponId: selectedWeapon,
            startPosition: [spawnPos.x, spawnPos.y, spawnPos.z],
            velocity: [velocity.x, velocity.y, velocity.z]
          };

          setProjectiles(prev => [...prev, newProj]);
        }
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, [appMode, selectedWeapon, mouse, camera, canUseWeapon, executeWeaponAction, playerRef]);

  const removeProjectile = (id: string) => {
    setProjectiles(prev => prev.filter(p => p.id !== id));
  };

  return (
    <group>
      {projectiles.map(p => (
        <Projectile
          key={p.id}
          id={p.id}
          weaponId={p.weaponId}
          startPosition={p.startPosition}
          velocity={p.velocity}
          onDestroyed={removeProjectile}
        />
      ))}
    </group>
  );
}