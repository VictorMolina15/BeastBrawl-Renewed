// src/stores/useTerrainStore.ts
import { create } from 'zustand';

const GRID_WIDTH: number = 100; // Explícito: GRID_WIDTH es un número
const GRID_HEIGHT: number = 50;  // Explícito: GRID_HEIGHT es un número

// --- Creamos una "interface" para describir la forma de nuestro store ---
// Esto es como el "plano" de nuestra casa.
interface TerrainState {
  grid: Uint8Array;
  width: number;
  height: number;
  destroyTerrain: (centerX: number, centerY: number, radius: number) => void;
}

// Hacemos explícito que esta función DEBE devolver un Uint8Array.
function createInitialTerrain(): Uint8Array {
  const grid = new Uint8Array(GRID_WIDTH * GRID_HEIGHT).fill(0);
  for (let x = 0; x < GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_HEIGHT / 2; y++) {
      grid[y * GRID_WIDTH + x] = 1;
    }
  }
  return grid;
}

// --- Aplicamos nuestra interface al crear el store con create<TerrainState> ---
export const useTerrainStore = create<TerrainState>((set, get) => ({
  grid: createInitialTerrain(),
  width: GRID_WIDTH,
  height: GRID_HEIGHT,

  // Hacemos explícitos los tipos de los parámetros de la función.
  destroyTerrain: (centerX: number, centerY: number, radius: number) => {
    // Gracias al tipado, TypeScript sabe que `get()` devuelve un objeto `TerrainState`.
    const { grid, width, height } = get();
    const newGrid = new Uint8Array(grid);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        if (distance < radius) {
          newGrid[y * width + x] = 0;
        }
      }
    }

    set({ grid: newGrid });
  },
}));