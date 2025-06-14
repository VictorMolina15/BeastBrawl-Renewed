import { create } from 'zustand';
import { createNoise2D } from 'simplex-noise'; 

const CHUNK_SIZE = 16;
const WORLD_WIDTH_IN_CHUNKS = 8;
const WORLD_HEIGHT_IN_CHUNKS = 4;
const TERRAIN_THICKNESS = 1;

interface TerrainState {
  chunkSize: number;
  chunks: Map<string, Uint8Array>;
  brushSize: number;
  selectedMaterialId: number;
  mapId: number;
  generateNewMap: () => void;
  setBrushSize: (size: number) => void;
  setSelectedMaterialId: (id: number) => void;
  destroyTerrain: (centerX: number, centerY: number, radius: number) => void;
  createTerrain: (centerX: number, centerY: number, radius: number, materialId: number) => void;
}

function createInitialChunks(): Map<string, Uint8Array> {
  const chunks = new Map<string, Uint8Array>();
  const noise2D = createNoise2D();

  for (let cx = 0; cx < WORLD_WIDTH_IN_CHUNKS; cx++) {
    for (let cy = 0; cy < WORLD_HEIGHT_IN_CHUNKS; cy++) {
      const chunkKey = `${cx},${cy},0`;
      const chunkData = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE).fill(0);
      const chunkPos = { x: cx * CHUNK_SIZE, y: cy * CHUNK_SIZE };

      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          const wx = chunkPos.x + lx;
          const wy = chunkPos.y + ly;
          const noiseValue = noise2D(wx / 30, wy / 20);
          if (noiseValue > -0.2) {
            for (let lz = 0; lz < TERRAIN_THICKNESS; lz++) {
              const index = lz * CHUNK_SIZE * CHUNK_SIZE + ly * CHUNK_SIZE + lx;
              chunkData[index] = 1; // Material por defecto
            }
          }
        }
      }
      chunks.set(chunkKey, chunkData);
    }
  }
  return chunks;
}

// --- LÓGICA DE MODIFICACIÓN PRECISA Y RECONSTRUIDA ---
const modifyTerrain = (
  chunks: Map<string, Uint8Array>,
  chunkSize: number,
  centerX: number, centerY: number, radius: number,
  modifyValue: number
) => {
  const newChunks = new Map(chunks);
  const affectedChunks = new Map<string, Uint8Array>();
  const radiusSq = radius * radius;

  // Redondeamos el centro para trabajar con coordenadas de vóxel enteras y precisas
  const intCenterX = Math.round(centerX);
  const intCenterY = Math.round(centerY);

  for (let x = intCenterX - radius; x <= intCenterX + radius; x++) {
    for (let y = intCenterY - radius; y <= intCenterY + radius; y++) {
      const dx = x - intCenterX;
      const dy = y - intCenterY;
      if (dx * dx + dy * dy >= radiusSq) continue;
      
      // Modificamos a través del grosor del terreno
      for (let z = 0; z < TERRAIN_THICKNESS; z++) {
        const worldX = x;
        const worldY = y;
        const worldZ = z;

        const chunkX = Math.floor(worldX / chunkSize);
        const chunkY = Math.floor(worldY / chunkSize);
        const chunkZ = 0; // Siempre operamos en el plano de chunks Z=0
        const chunkKey = `${chunkX},${chunkY},${chunkZ}`;

        let chunkData = affectedChunks.get(chunkKey);
        if (!chunkData) {
          const originalData = newChunks.get(chunkKey);
          if (!originalData) continue;
          chunkData = new Uint8Array(originalData);
          affectedChunks.set(chunkKey, chunkData);
        }

        const localX = worldX - chunkX * chunkSize;
        const localY = worldY - chunkY * chunkSize;
        const localZ = worldZ;
        const index = localZ * chunkSize * chunkSize + localY * chunkSize + localX;
        
        if (index >= 0 && index < chunkData.length) {
          chunkData[index] = modifyValue;
        }
      }
    }
  }
  
  affectedChunks.forEach((value, key) => newChunks.set(key, value));
  return newChunks;
};


export const useTerrainStore = create<TerrainState>((set) => ({
  chunkSize: CHUNK_SIZE,
  chunks: createInitialChunks(),
  selectedMaterialId: 1,
  brushSize: 5,
  mapId: 0,
  setSelectedMaterialId: (id) => set({ selectedMaterialId: id }),
  setBrushSize: (size) => set({ brushSize: size }),
  generateNewMap: () => set((state) => ({ 
      chunks: createInitialChunks(),
      mapId: state.mapId + 1 
  })),
  destroyTerrain: (centerX, centerY, radius) => {
    set((state) => ({
      chunks: modifyTerrain(state.chunks, state.chunkSize, centerX, centerY, radius, 0)
    }));
  },
  createTerrain: (centerX, centerY, radius, materialId) => {
    set((state) => ({
      chunks: modifyTerrain(state.chunks, state.chunkSize, centerX, centerY, radius, materialId)
    }));
  },
}));
