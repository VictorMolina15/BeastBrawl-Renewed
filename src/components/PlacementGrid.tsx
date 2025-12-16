// src/components/PlacementGrid.tsx
import { useState } from 'react';
import { Plane, Grid } from '@react-three/drei';
import { useTerrainStore } from '../stores/useTerrainStore';
import { MATERIALS_DB } from '../config/materials';
import * as THREE from 'three';

// El tamaño del mundo en vóxeles
const WORLD_WIDTH_VOXELS = 8 * 16;
const WORLD_HEIGHT_VOXELS = 4 * 16;

export function PlacementGrid() {
  const createTerrain = useTerrainStore(state => state.createTerrain);
  const destroyTerrain = useTerrainStore(state => state.destroyTerrain);
  const brushSize = useTerrainStore(state => state.brushSize);
  const selectedMaterialId = useTerrainStore(state => state.selectedMaterialId);
  const selectedVariationId = useTerrainStore((state) => state.selectedVariationId);
  const showGrid = useTerrainStore(state => state.showGrid);

  // Estado para la posición del cursor (snapped)
  const [hoverPos, setHoverPos] = useState<[number, number, number] | null>(null);
  
  // Obtenemos el color del material seleccionado para el "Ghost Block"
  const materialDef = MATERIALS_DB[selectedMaterialId];
  let activeColor = '#ffffff';
  if (materialDef) {
      const variation = materialDef.variations?.[selectedVariationId];
      activeColor = variation ? variation.color : materialDef.color;
  }

  // --- MANEJO DEL MOUSE ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    const x = Math.round(e.point.x); 
    const y = Math.round(e.point.y); 
    setHoverPos([x, y, 0]);
  };

  const handlePointerOut = () => {
    setHoverPos(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (e: any) => {
    e.stopPropagation();
    const x = Math.round(e.point.x);
    const y = Math.round(e.point.y); 
    createTerrain(x, y, brushSize, selectedMaterialId);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleContextMenu = (e: any) => {
      e.stopPropagation();
      e.nativeEvent.preventDefault();
      if (!e.face) return;
      const x = Math.round(e.point.x);
      const y = Math.round(e.point.y); 
      destroyTerrain(x, y, brushSize);
  };

  return (
    <group>
        {/* 1. GRID VISUAL (Estético) */}
        {/* Lo colocamos ligeramente atrás (-0.01) para que no parpadee con los bloques */}
        {showGrid && (
            <Grid
                position={[63.5, 31.5, 1]} 
                rotation={[1.57, 0, 0]} // Rotación correcta para vista frontal
                args={[WORLD_WIDTH_VOXELS, WORLD_HEIGHT_VOXELS]} 
                cellSize={1}        
                sectionSize={16}    
                cellThickness={1}   
                sectionThickness={1.5} 
                cellColor="#6f6f6f" 
                sectionColor="#9d9d9d" 
                fadeDistance={200}  
                infiniteGrid={false} 
            />
        )}

        {/* 2. PLANO INTERACTIVO (Invisible pero detecta el mouse) */}
        <Plane
            args={[WORLD_WIDTH_VOXELS, WORLD_HEIGHT_VOXELS]}
            position={[63.5, 31.5, 0]} // En Z=0
            visible={false} // Invisible visualmente
            onPointerMove={handlePointerMove}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
        />

        {/* 3. CURSOR "GHOST" (Visualización) */}
        {hoverPos && (
            <group position={hoverPos}>
                {/* A. El bloque fantasma (donde caerá el clic) */}
                <mesh>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshBasicMaterial 
                        color={activeColor} 
                        transparent 
                        opacity={0.6} // Semitransparente
                        wireframe={false}
                    />
                    {/* Borde wireframe para que se vea más técnico */}
                    <lineSegments>
                        <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
                        <lineBasicMaterial color="white" opacity={0.8} transparent />
                    </lineSegments>
                </mesh>

                {/* B. Indicador de Área del Pincel (Si es mayor a 1) */}
                {brushSize > 1 && (
                    <mesh position={[0, 0, 0.51]} rotation={[0, 0, 0]}>
                      {/* Un anillo plano que muestra el radio de efecto */}
                      <ringGeometry args={[brushSize - 0.1, brushSize, 64]} />
                      <meshBasicMaterial color="#FFD700" transparent opacity={0.5} side={THREE.DoubleSide} />
                    </mesh>
                )}
            </group>
        )}
    </group>
  );
}