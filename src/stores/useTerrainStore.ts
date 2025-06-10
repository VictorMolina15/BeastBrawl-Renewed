import { create } from 'zustand';
import { createNoise2D } from 'simplex-noise'; 

const CHUNK_SIZE = 16;
const WORLD_WIDTH_IN_CHUNKS = 8;
const WORLD_HEIGHT_IN_CHUNKS = 4;
const TERRAIN_THICKNESS = 1; // ¡NUEVO! Grosor de nuestro mundo en vóxeles.

interface TerrainState {
  chunkSize: number;
  chunks: Map<string, Uint8Array>;

  // Nuevos estados para la UI
  brushSize: number;
  cubeColor: string;
  mapId: number; 
  selectedMaterialId: number;

  // Nuevas acciones para la UI
  setBrushSize: (size: number) => void;
  setCubeColor: (color: string) => void;
  generateNewMap: () => void;
  setSelectedMaterialId: (id: number) => void;
  
  destroyTerrain: (centerX: number, centerY: number, centerZ: number, radius: number) => void;
  createTerrain: (centerX: number, centerY: number, centerZ: number, radius: number) => void;
  getVoxel: (x: number, y: number, z: number) => number;
}

// --- VERSIÓN 2.5D DE LA CREACIÓN DEL MUNDO ---
function createInitialChunks(): Map<string, Uint8Array> {
  const chunks = new Map<string, Uint8Array>();
  const noise2D = createNoise2D();

  // El tamaño del mundo en chunks en el eje Z ahora es 1
  for (let cx = 0; cx < WORLD_WIDTH_IN_CHUNKS; cx++) {
    for (let cy = 0; cy < WORLD_HEIGHT_IN_CHUNKS; cy++) {
      const cz = 0; // Forzamos un solo chunk de profundidad en Z
      const chunkKey = `${cx},${cy},${cz}`;
      const chunkData = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE).fill(0);
      const chunkPos = { x: cx * CHUNK_SIZE, y: cy * CHUNK_SIZE, z: cz * CHUNK_SIZE };

      // Iteramos en X e Y para el perfil del terreno
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          const wx = chunkPos.x + lx;
          const wy = chunkPos.y + ly;
          
          // Usamos ruido 2D para decidir si un pilar en (X, Y) existe
          // El factor de escala (/30) controla el "zoom". Más pequeño = colinas más grandes.
          const noiseValue = noise2D(wx / 30, wy / 20);

          // Si el valor de ruido es mayor a un umbral, creamos un "pilar" de tierra
          if (noiseValue > -0.2) {
            // Creamos el pilar con el grosor definido
            for (let lz = 0; lz < TERRAIN_THICKNESS; lz++) {
              const index = lz * CHUNK_SIZE * CHUNK_SIZE + ly * CHUNK_SIZE + lx;
              chunkData[index] = 1;
            }
          }
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
  modifyValue:  number
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
  selectedMaterialId: 1, // Por defecto, pintamos con "Tierra"

  setSelectedMaterialId: (id) => set({ selectedMaterialId: id }),
  
  // --- NUEVOS ESTADOS Y SUS VALORES INICIALES ---
  brushSize: 5,
  cubeColor: '#8B4513',
  mapId: 0, // El ID del mapa actual

  // --- NUEVAS ACCIONES ---
  setBrushSize: (size) => set({ brushSize: size }),
  setCubeColor: (color) => set({ cubeColor: color }),
  
  // --- generateNewMap MEJORADO ---
  generateNewMap: () => {
    console.log("Generando nuevo mapa...");
    set((state) => ({ 
      chunks: createInitialChunks(),
      mapId: state.mapId + 1 // <-- Incrementamos el ID para forzar el reseteo
    }));
  },


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
    const { chunks, chunkSize, selectedMaterialId } = get();
    const newChunks = modifyTerrain(chunks, chunkSize, centerX, centerY, centerZ, radius, selectedMaterialId);
    set({ chunks: newChunks });
  },
}));