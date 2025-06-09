import { create } from 'zustand';
//import { createNoise3D } from 'simplex-noise';

const CHUNK_SIZE = 16;
const WORLD_WIDTH_IN_CHUNKS = 4;
const WORLD_HEIGHT_IN_CHUNKS = 2;

interface TerrainState {
  chunkSize: number;
  chunks: Map<string, Uint8Array>;
  destroyTerrain: (centerX: number, centerY: number, centerZ: number, radius: number) => void;
  createTerrain: (centerX: number, centerY: number, centerZ: number, radius: number) => void;
  getVoxel: (x: number, y: number, z: number) => number;
}

function createInitialChunks(): Map<string, Uint8Array> {
  const chunks = new Map<string, Uint8Array>();
  for (let cx = 0; cx < WORLD_WIDTH_IN_CHUNKS; cx++) {
    for (let cy = 0; cy < WORLD_HEIGHT_IN_CHUNKS; cy++) {
      const chunkKey = `${cx},${cy},0`;
      const chunkData = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE).fill(0);
      if (cx === 1 && cy === 1) { // Ponemos la semilla en un chunk que no esté en el borde
        const start = Math.floor(CHUNK_SIZE / 2) - 2;
        const end = Math.floor(CHUNK_SIZE / 2) + 2;
        for (let x = start; x < end; x++) for (let y = start; y < end; y++) for (let z = start; z < end; z++) {
          const index = y * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x;
          chunkData[index] = 1;
        }
      }
      chunks.set(chunkKey, chunkData);
    }
  }
  return chunks;
}

// --- LA LÓGICA DE MODIFICACIÓN REFINADA ---
// Esta función auxiliar se encargará de modificar los chunks
const modifyTerrain = (
  chunks: Map<string, Uint8Array>,
  chunkSize: number,
  centerX: number, centerY: number, centerZ: number, radius: number,
  modifyValue: 0 | 1 // 0 para destruir, 1 para crear
) => {
  const newChunks = new Map(chunks);
  const affectedChunks = new Map<string, Uint8Array>();
  const radiusSq = radius * radius;

  for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x++) {
    for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y++) {
      for (let z = Math.floor(centerZ - radius); z <= Math.ceil(centerZ + radius); z++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dz = z - centerZ;
        if (dx * dx + dy * dy + dz * dz > radiusSq) continue;
        
        const chunkX = Math.floor(x / chunkSize);
        const chunkY = Math.floor(y / chunkSize);
        const chunkZ = Math.floor(z / chunkSize);
        const chunkKey = `${chunkX},${chunkY},${chunkZ}`;

        // Obtenemos o creamos una copia del chunk UNA SOLA VEZ
        let chunkData = affectedChunks.get(chunkKey);
        if (!chunkData) {
          const originalData = newChunks.get(chunkKey);
          if (!originalData) continue;
          chunkData = new Uint8Array(originalData);
          affectedChunks.set(chunkKey, chunkData);
        }

        const localX = x - chunkX * chunkSize;
        const localY = y - chunkY * chunkSize;
        const localZ = z - chunkZ * chunkSize;
        const index = localY * chunkSize * chunkSize + localZ * chunkSize + localX;
        
        if (index >= 0 && index < chunkData.length) {
          chunkData[index] = modifyValue;
        }
      }
    }
  }
  
  // Aplicamos los chunks modificados al mapa principal
  affectedChunks.forEach((value, key) => {
    newChunks.set(key, value);
  });
  
  return newChunks;
};


export const useTerrainStore = create<TerrainState>((set, get) => ({
  chunkSize: CHUNK_SIZE,
  chunks: createInitialChunks(),
  
  getVoxel: (x, y, z) => {
    // Convierte coordenadas del mundo a coordenadas del chunk
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const chunkZ = Math.floor(z / CHUNK_SIZE);
    
    // Obtiene el chunk
    const chunkKey = `${chunkX},${chunkY},${chunkZ}`;
    const chunkData = get().chunks.get(chunkKey);
    if (!chunkData) {
      return 0; // Fuera del mundo es aire
    }
    
    // Convierte coordenadas del mundo a coordenadas locales del chunk
    const localX = x % CHUNK_SIZE;
    const localY = y % CHUNK_SIZE;
    const localZ = z % CHUNK_SIZE;

    const index = localY * CHUNK_SIZE * CHUNK_SIZE + localZ * CHUNK_SIZE + localX;
    return chunkData[index];
  },

  destroyTerrain: (centerX, centerY, centerZ, radius) => {
    const { chunks, chunkSize } = get();
    const newChunks = modifyTerrain(chunks, chunkSize, centerX, centerY, centerZ, radius, 0);
    set({ chunks: newChunks });
  },

  createTerrain: (centerX, centerY, centerZ, radius) => {
    const { chunks, chunkSize } = get();
    const newChunks = modifyTerrain(chunks, chunkSize, centerX, centerY, centerZ, radius, 1);
    set({ chunks: newChunks });
  },
}));