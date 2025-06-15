// src/components/PlacementGrid.tsx

import { Plane } from '@react-three/drei';
import { useTerrainStore } from '../stores/useTerrainStore';
import * as THREE from 'three';

// El tamaño del mundo en vóxeles (ajusta según sea necesario)
const WORLD_WIDTH_VOXELS = 8 * 16; // 8 chunks * 16 de tamaño
const WORLD_HEIGHT_VOXELS = 4 * 16; // 4 chunks * 16 de tamaño

export function PlacementGrid() {
  const createTerrain = useTerrainStore(state => state.createTerrain);
  const destroyTerrain = useTerrainStore(state => state.destroyTerrain);
  const brushSize = useTerrainStore(state => state.brushSize);
  const selectedMaterialId = useTerrainStore(state => state.selectedMaterialId);
    
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (e: any) => {
    e.stopPropagation();
    
    // El punto de intersección (e.point) nos da coords flotantes (ej: 15.7, 23.2)
    // Usamos Math.floor para "ajustar" esas coordenadas al grid de vóxeles.
    const x = Math.floor(e.point.x);
    const y = Math.floor(e.point.y);

    createTerrain(x, y, brushSize, selectedMaterialId);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleContextMenu = (e: any) => {
      e.stopPropagation();
      e.nativeEvent.preventDefault();
      if (!e.face) return;
      const existingVoxelPos = new THREE.Vector3().copy(e.point).sub(e.face.normal.clone().multiplyScalar(0.5));
      // Igual aquí, ya no sumamos la posición del chunk.
      destroyTerrain(existingVoxelPos.x, existingVoxelPos.y, brushSize);
  };

  return (
    <Plane
      args={[WORLD_WIDTH_VOXELS, WORLD_HEIGHT_VOXELS]}
      position={[64, 32, -.1]} // Colocado en el centro, en el plano Z=0
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      // Rota el plano para que esté de frente a la cámara ortográfica
      rotation={[0, 0, 0]}
    >
      {/* Este material es invisible pero intercepta los clicks */}
      <meshBasicMaterial visible={true} side={THREE.DoubleSide} />
    </Plane>
  );
}