import { create } from 'zustand';
import { createNoise2D } from 'simplex-noise'; 

const CHUNK_SIZE = 16;
const WORLD_WIDTH_IN_CHUNKS = 8;
const WORLD_HEIGHT_IN_CHUNKS = 4;
const TERRAIN_THICKNESS = 1;

interface TerrainState {
  chunkSize: number;
  chunks: Map<string, Uint8Array>;
  variations: Map<string, Uint8Array>;
  brushSize: number;
  selectedMaterialId: number;
  selectedVariationId: number;
  mapId: number;
  openPopupId: number | null;
  showGrid: boolean;
  generateNewMap: () => void;
  setBrushSize: (size: number) => void;
  setSelectedMaterialId: (id: number) => void;
  setSelectedVariationId: (id: number) => void;
  destroyTerrain: (centerX: number, centerY: number, radius: number) => void;
  createTerrain: (centerX: number, centerY: number, radius: number, materialId: number) => void;
  getVoxel: (x: number, y: number, z: number) => number;
  getVariation: (x: number, y: number, z: number) => number;
  setOpenPopupId: (id: number | null) => void;
  toggleGrid: () => void;
}

function createInitialChunks(): { chunks: Map<string, Uint8Array>; variations: Map<string, Uint8Array> } {
  const chunks = new Map<string, Uint8Array>();
  const variations = new Map<string, Uint8Array>();
  const noise2D = createNoise2D();

  for (let cx = 0; cx < WORLD_WIDTH_IN_CHUNKS; cx++) {
    for (let cy = 0; cy < WORLD_HEIGHT_IN_CHUNKS; cy++) {
      const chunkKey = `${cx},${cy},0`;
      const chunkData = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE).fill(0);
      const chunkVars = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE).fill(0); // Lleno de 0 (Variación "Normal")
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
              chunkVars[index] = 0;
            }
          }
        }
      }
      chunks.set(chunkKey, chunkData);
      variations.set(chunkKey, chunkVars);
    }
  }
  return { chunks, variations };
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

const initialData = createInitialChunks();

export const useTerrainStore = create<TerrainState>((set, get) => ({
  chunkSize: CHUNK_SIZE,
  chunks: initialData.chunks,
  variations: initialData.variations,
  selectedMaterialId: 1,
  selectedVariationId: 0,
  brushSize: 1,
  mapId: 0,
  openPopupId: null,
  showGrid: true,
  setSelectedMaterialId: (id) => set({ selectedMaterialId: id }),
  setSelectedVariationId: (id) => set({ selectedVariationId: id }),
  setBrushSize: (size) => set({ brushSize: size }),
  setOpenPopupId: (id) => set({ openPopupId: id }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })), 
  generateNewMap: () => {
      const newData = createInitialChunks();
      set((state) => ({ 
          chunks: newData.chunks,
          variations: newData.variations,
          mapId: state.mapId + 1 
      }));
  },
  destroyTerrain: (centerX, centerY, radius) => {
    set((state) => ({
      chunks: modifyTerrain(state.chunks, state.chunkSize, centerX, centerY, radius, 0),
      variations: modifyTerrain(state.variations, state.chunkSize, centerX, centerY, radius, 0)
    }));
  },
  createTerrain: (centerX, centerY, radius, materialId) => {
    set((state) => ({
      chunks: modifyTerrain(state.chunks, state.chunkSize, centerX, centerY, radius, materialId),
      variations: modifyTerrain(state.variations, state.chunkSize, centerX, centerY, radius, state.selectedVariationId)
    }));
  },
  // --- IMPLEMENTACIÓN DE getVoxel ---
  getVoxel: (x: number, y: number, z: number) => {
    const { chunks, chunkSize } = get();
    // 1. Encontrar en qué chunk está esta coordenada global
    const chunkX = Math.floor(x / chunkSize);
    const chunkY = Math.floor(y / chunkSize);
    const chunkZ = Math.floor(z / chunkSize);
    const key = `${chunkX},${chunkY},${chunkZ}`;

    // 2. Obtener el chunk
    const chunkData = chunks.get(key);
    if (!chunkData) return 0;

    // 3. Calcular coordenada local dentro del chunk
    const lx = x - chunkX * chunkSize;
    const ly = y - chunkY * chunkSize;
    const lz = z - chunkZ * chunkSize;

    const index = lz * chunkSize * chunkSize + ly * chunkSize + lx;
    return chunkData[index] || 0;
  },
  getVariation: (x: number, y: number, z: number) => {
    const { variations, chunkSize } = get();
    const chunkX = Math.floor(x / chunkSize);
    const chunkY = Math.floor(y / chunkSize);
    const chunkZ = Math.floor(z / chunkSize);
    const key = `${chunkX},${chunkY},${chunkZ}`;

    const variationData = variations.get(key);
    if (!variationData) return 0;

    const lx = x - chunkX * chunkSize;
    const ly = y - chunkY * chunkSize;
    const lz = z - chunkZ * chunkSize;

    const index = lz * chunkSize * chunkSize + ly * chunkSize + lx;
    return variationData[index] || 0;
  }
}));
