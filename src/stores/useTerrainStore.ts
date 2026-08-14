import { create } from 'zustand';
import { createNoise2D } from 'simplex-noise';
import { MATERIALS_DB } from '../config/materials';

const CHUNK_SIZE = 16;
const WORLD_WIDTH_IN_CHUNKS = 8;
const WORLD_HEIGHT_IN_CHUNKS = 4;
const TERRAIN_THICKNESS = 1;

// --- HELPERS PARA JSON ---
const uint8ToBase64 = (arr: Uint8Array) => btoa(String.fromCharCode(...arr));
const base64ToUint8 = (str: string) => new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));

const MAX_HISTORY = 20;

interface TerrainState {
  chunkSize: number;
  chunks: Map<string, Uint8Array>;
  variations: Map<string, Uint8Array>;
  materialVariations: Record<number, number>;
  brushSize: number;
  selectedMaterialId: number;
  selectedVariationId: number;
  mapId: number;
  openPopupId: number | null;
  showGrid: boolean;
  history: Array<Map<string, Uint8Array>>;
  future: Array<Map<string, Uint8Array>>;
  currentBiome: string;
  damageMap: Map<string, number>;
  damageVersion: number;
  snapshot: {
    chunks: Map<string, Uint8Array>;
    variations: Map<string, Uint8Array>;
    damageMap: Map<string, number>;
  } | null;
  saveSnapshot: () => void;
  restoreSnapshot: () => void;
  damageTerrain: (centerX: number, centerY: number, radius: number, damage: number) => void;
  setBiome: (biome: string) => void;
  generateNewMap: () => void;
  setBrushSize: (size: number) => void;
  setSelectedMaterialId: (id: number) => void;
  setMaterialVariation: (matId: number, varId: number) => void;
  destroyTerrain: (centerX: number, centerY: number, radius: number) => void;
  createTerrain: (centerX: number, centerY: number, radius: number, materialId: number) => void;
  getVoxel: (x: number, y: number, z: number) => number;
  getVariation: (x: number, y: number, z: number) => number;
  setOpenPopupId: (id: number | null) => void;
  toggleGrid: () => void;
  saveLevel: () => void;
  loadLevel: (file: File) => Promise<void>;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
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
          notifyNeighborChunks(x, y, chunkSize, newChunks, affectedChunks);
        }
      }
    }
  }

  affectedChunks.forEach((value, key) => newChunks.set(key, value));
  return newChunks;
};

const initialData = createInitialChunks();

const notifyNeighborChunks = (
  worldX: number,
  worldY: number,
  chunkSize: number,
  newChunks: Map<string, Uint8Array>,
  affectedChunks: Map<string, Uint8Array>
) => {
  const chunkX = Math.floor(worldX / chunkSize);
  const chunkY = Math.floor(worldY / chunkSize);
  const localX = worldX - chunkX * chunkSize;
  const localY = worldY - chunkY * chunkSize;

  const touch = (nx: number, ny: number) => {
    const key = `${nx},${ny},0`;
    if (!affectedChunks.has(key) && newChunks.has(key)) {
      const data = newChunks.get(key);
      if (data) affectedChunks.set(key, new Uint8Array(data));
    }
  };

  if (localX === 0) touch(chunkX - 1, chunkY);
  if (localX === chunkSize - 1) touch(chunkX + 1, chunkY);
  if (localY === 0) touch(chunkX, chunkY - 1);
  if (localY === chunkSize - 1) touch(chunkX, chunkY + 1);
};

export const useTerrainStore = create<TerrainState>((set, get) => ({
  chunkSize: CHUNK_SIZE,
  chunks: initialData.chunks,
  variations: initialData.variations,
  materialVariations: {},
  selectedMaterialId: 1,
  selectedVariationId: 0,
  brushSize: 1,
  mapId: 0,
  openPopupId: null,
  showGrid: true,
  history: [],
  future: [],
  damageMap: new Map(),
  damageVersion: 0, // Trigger para forzar re-render visual de daño
  currentBiome: 'EDITOR',
  snapshot: null,
  saveSnapshot: () => {
    const { chunks, variations, damageMap } = get();
    set({
      snapshot: {
        chunks: new Map(chunks), // Clonamos los Map para no mutar las referencias
        variations: new Map(variations),
        damageMap: new Map(damageMap)
      }
    });
  },
  restoreSnapshot: () => {
    const { snapshot, mapId, damageVersion } = get();
    if (!snapshot) return;

    set({
      chunks: new Map(snapshot.chunks),
      variations: new Map(snapshot.variations),
      damageMap: new Map(snapshot.damageMap),
      mapId: mapId + 1, // Forzamos a Rapier a recalcular colisiones
      damageVersion: damageVersion + 1 // Forzamos a los shaders a borrar las grietas
    });
  },
  setBiome: (biome: string) => {
    set({ currentBiome: biome });
  },
  setSelectedMaterialId: (id) => set((state) => ({
    selectedMaterialId: id,
    selectedVariationId: state.materialVariations[id] || 0
  })),
  setMaterialVariation: (matId, varId) => set((state) => {
    const newVariations = { ...state.materialVariations, [matId]: varId };

    // Si estamos editando el material que está seleccionado actualmente,
    // actualizamos también la variable global 'selectedVariationId' para que el Cursor responda.
    const shouldUpdateGlobal = state.selectedMaterialId === matId;

    return {
      materialVariations: newVariations,
      selectedVariationId: shouldUpdateGlobal ? varId : state.selectedVariationId
    };
  }),
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
  pushHistory: () => {
    const { chunks } = get();
    set((state) => ({
      history: [new Map(chunks), ...state.history].slice(0, MAX_HISTORY),
      future: [] // Limpiamos el futuro al hacer una acción nueva
    }));
  },
  undo: () => {
    const { history, chunks, future } = get();
    if (history.length === 0) return;

    const previous = history[0];
    const newHistory = history.slice(1);

    set({
      chunks: previous,
      history: newHistory,
      future: [new Map(chunks), ...future].slice(0, MAX_HISTORY),
      mapId: get().mapId + 1 // Forzamos re-render de colisiones
    });
  },

  redo: () => {
    const { future, chunks, history } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    set({
      chunks: next,
      future: newFuture,
      history: [new Map(chunks), ...history].slice(0, MAX_HISTORY),
      mapId: get().mapId + 1
    });
  },

  saveLevel: () => {
    const { chunks, variations, currentBiome } = get();
    const levelData = {
      version: "1.0",
      background: currentBiome, 
      music: "default",      
      chunks: Array.from(chunks.entries()).map(([key, data]) => ({
        key,
        data: uint8ToBase64(data),
        vars: uint8ToBase64(variations.get(key) || new Uint8Array(data.length))
      }))
    };

    const blob = new Blob([JSON.stringify(levelData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `beastbrawl_level_${Date.now()}.json`;
    link.click();
  },

  loadLevel: async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text);

    const newChunks = new Map<string, Uint8Array>();
    const newVars = new Map<string, Uint8Array>();

    interface ChunkData {
      key: string;
      data: string;
      vars: string;
    }

    (parsed.chunks as ChunkData[]).forEach((c) => {
      newChunks.set(c.key, base64ToUint8(c.data));
      newVars.set(c.key, base64ToUint8(c.vars));
    });

    set((state) => ({
      chunks: newChunks,
      currentBiome: parsed.background || state.currentBiome,
      variations: newVars,
      mapId: state.mapId + 1,
      history: [],
      future: []
    }));
  },
  damageTerrain: (centerX, centerY, radius, damageAmount) => {
    const { chunks, chunkSize, damageMap, damageVersion } = get();
    const newChunks = new Map(chunks);
    const newDamageMap = new Map(damageMap);
    const affectedChunks = new Map<string, Uint8Array>();

    let destroyedAny = false;
    let damagedAny = false;

    // Helper SEGURO para refrescar vecinos
    const touch = (nx: number, ny: number) => {
      const key = `${nx},${ny},0`;
      if (!affectedChunks.has(key) && newChunks.has(key)) {
        const data = newChunks.get(key);
        if (data) affectedChunks.set(key, new Uint8Array(data));
      }
    };

    const applyDamageToVoxel = (x: number, y: number, z: number) => {
      const chunkX = Math.floor(x / chunkSize);
      const chunkY = Math.floor(y / chunkSize);
      const chunkKey = `${chunkX},${chunkY},0`;

      let chunkData = affectedChunks.get(chunkKey) || newChunks.get(chunkKey);
      if (!chunkData) return;

      const localX = x - chunkX * chunkSize;
      const localY = y - chunkY * chunkSize;
      const index = z * chunkSize * chunkSize + localY * chunkSize + localX;
      
      const voxelId = chunkData[index];
      if (voxelId === 0) return; 

      if (!affectedChunks.has(chunkKey)) {
        chunkData = new Uint8Array(chunkData);
        affectedChunks.set(chunkKey, chunkData);
      }

      const materialDef = MATERIALS_DB[voxelId];
      const hardness = materialDef?.hardness || 1;
      const globalKey = `${x},${y},${z}`;

      if (hardness <= 0) {
        chunkData[index] = 0;
        destroyedAny = true;
        if (localX === 0) touch(chunkX - 1, chunkY);
        if (localX === chunkSize - 1) touch(chunkX + 1, chunkY);
        if (localY === 0) touch(chunkX, chunkY - 1);
        if (localY === chunkSize - 1) touch(chunkX, chunkY + 1);
        return;
      }

      const currentDamage = newDamageMap.get(globalKey) || 0;
      const nextDamage = currentDamage + damageAmount;

      if (nextDamage >= hardness) {
        chunkData[index] = 0; 

        newDamageMap.set(globalKey, nextDamage); 
        
        destroyedAny = true;
        if (localX === 0) touch(chunkX - 1, chunkY);
        if (localX === chunkSize - 1) touch(chunkX + 1, chunkY);
        if (localY === 0) touch(chunkX, chunkY - 1);
        if (localY === chunkSize - 1) touch(chunkX, chunkY + 1);
      } else {
        newDamageMap.set(globalKey, nextDamage); 
        damagedAny = true;
      }
    };

    // =========================================================
    // 1. ESCÁNER RECUPERADO (Obligatorio para la resortera)
    // =========================================================
    let targetX = Math.round(centerX);
    let targetY = Math.round(centerY);
    const targetZ = 0; 

    let minDist = Infinity;
    let foundSolid = false;
    const baseRx = Math.round(centerX);
    const baseRy = Math.round(centerY);

    // Escaneamos 3x3 para anclarnos al bloque físico real
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const tx = baseRx + ox;
        const ty = baseRy + oy;
        
        const cx = Math.floor(tx / chunkSize);
        const cy = Math.floor(ty / chunkSize);
        const cData = newChunks.get(`${cx},${cy},0`);
        
        if (cData) {
          const lx = tx - cx * chunkSize;
          const ly = ty - cy * chunkSize;
          if (lx >= 0 && lx < chunkSize && ly >= 0 && ly < chunkSize) {
             const idx = targetZ * chunkSize * chunkSize + ly * chunkSize + lx;
             if (cData[idx] !== 0) {
               const dist = (tx - centerX) * (tx - centerX) + (ty - centerY) * (ty - centerY);
               if (dist < minDist) {
                 minDist = dist;
                 targetX = tx;
                 targetY = ty;
                 foundSolid = true;
               }
             }
          }
        }
      }
    }

    if (!foundSolid) return;

    // =========================================================
    // 2. APLICAR DAÑO (Modos Armónicos)
    // =========================================================
    if (radius === 0) {
      // RESORTERA: Impacto matemático directo
      applyDamageToVoxel(targetX, targetY, targetZ);
    } else {
      const searchRadius = Math.ceil(radius) + 1; 

      for (let x = targetX - searchRadius; x <= targetX + searchRadius; x++) {
        for (let y = targetY - searchRadius; y <= targetY + searchRadius; y++) {
          const dx = Math.abs(x - targetX);
          const dy = Math.abs(y - targetY);
          const distance = Math.round(Math.sqrt(dx * dx + dy * dy));
          
          if (distance <= radius) {
            applyDamageToVoxel(x, y, targetZ);
          }
        }
      }
    }

    if (destroyedAny) get().pushHistory();

    if (destroyedAny) {
      affectedChunks.forEach((value, key) => newChunks.set(key, value));
      set({
        chunks: newChunks,
        damageMap: newDamageMap,
        damageVersion: damageVersion + 1
      });
    } else if (damagedAny) {
      set({
        damageMap: newDamageMap,
        damageVersion: damageVersion + 1
      });
    }
  },
  destroyTerrain: (centerX, centerY, radius) => {
    get().pushHistory();
    set((state) => ({
      chunks: modifyTerrain(state.chunks, state.chunkSize, centerX, centerY, radius, 0),
      variations: modifyTerrain(state.variations, state.chunkSize, centerX, centerY, radius, 0)
    }));
  },
  createTerrain: (centerX, centerY, radius, materialId) => {
    const { brushSize, selectedVariationId, damageMap } = get();
    const effectiveRadius = radius || brushSize;

    get().pushHistory();

    // 1. Clonar el mapa de daño para limpiar las coordenadas del nuevo bloque
    const newDamageMap = new Map(damageMap);
    let cleanedAnyDamage = false;

    const minX = Math.floor(centerX - effectiveRadius);
    const maxX = Math.ceil(centerX + effectiveRadius);
    const minY = Math.floor(centerY - effectiveRadius);
    const maxY = Math.ceil(centerY + effectiveRadius);
    const radiusSq = effectiveRadius * effectiveRadius;

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const dx = x - centerX;
        const dy = y - centerY;
        if (dx * dx + dy * dy <= radiusSq) {
          for (let z = 0; z < TERRAIN_THICKNESS; z++) {
            const globalKey = `${x},${y},${z}`;
            if (newDamageMap.has(globalKey)) {
              newDamageMap.delete(globalKey);
              cleanedAnyDamage = true;
            }
          }
        }
      }
    }

    // 2. Actualizar el estado con el mapa de daño limpio y el incremento de versión
    set((state) => ({
      chunks: modifyTerrain(state.chunks, state.chunkSize, centerX, centerY, effectiveRadius, materialId),
      variations: modifyTerrain(state.variations, state.chunkSize, centerX, centerY, effectiveRadius, selectedVariationId),
      damageMap: newDamageMap,
      damageVersion: cleanedAnyDamage ? state.damageVersion + 1 : state.damageVersion
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
