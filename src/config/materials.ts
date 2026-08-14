
export interface MaterialVariation {
  id: number;
  name: string;
  color: string;
  image?: string; // Thumbnail (opcional)
  atlasPos?: { x: number, y: number };
}

export const ATLAS_CONFIG = {
  cols: 16,
  rows: 16,
};

export interface MaterialDef {
  id: number;
  name: string;
  type: 'BASE' | 'GRASS' | 'PROP';
  propShape?: 'PLANE' | 'MODEL';
  color: string; // Color base (fallback)
  hardness: number;
  atlasPos?: { x: number, y: number };
  variations: Record<number, MaterialVariation>;
}

export const MATERIALS_DB: Record<number, MaterialDef> = {
  1: {
    id: 1,
    name: 'Tierra',
    type: 'BASE',
    color: '#FFF',
    atlasPos: { x: 0, y: 0 },
    hardness: 20,
    variations: {
      0: { id: 0, name: 'Normal', color: '#FFF', atlasPos: { x: 0, y: 0 } },
      1: { id: 1, name: 'Otoñal', color: '#D2691E' },
    }
  },
  2: {
    id: 2,
    name: 'Piedra',
    type: 'BASE',
    color: '#9DA6B3',
    atlasPos: { x: 2, y: 0 },
    hardness: 50,
    variations: {
      0: { id: 0, name: 'Normal', color: '#FFF', atlasPos: { x: 2, y: 0 } },
      1: { id: 1, name: 'Estilizada-1', color: '#FFF', atlasPos: { x: 3, y: 0 } },
      2: { id: 2, name: 'Estilizada-2', color: '#FFF', atlasPos: { x: 4, y: 0 } },
      3: { id: 3, name: 'Estilizada-3', color: '#FFF', atlasPos: { x: 5, y: 0 } },
      4: { id: 4, name: 'Estilizada-4', color: '#FFF', atlasPos: { x: 6, y: 0 } },
      5: { id: 5, name: 'Estilizada-5', color: '#FFF', atlasPos: { x: 7, y: 0 } },
    },
  },
  3: {
    id: 3,
    name: 'Ladrillo',
    type: 'BASE',
    color: '#B22222',
    hardness: 35,
    variations: {
      0: { id: 0, name: 'Rojo', color: '#B22222' },
      1: { id: 1, name: 'Marrón', color: '#8B4513' },
      2: { id: 2, name: 'Blanco', color: '#F5F5F5' },
    },
  },
  4: {
    id: 4,
    name: 'Hielo',
    type: 'BASE',
    color: '#ADD8E6',
    hardness: 20,
    variations: {
      0: { id: 0, name: 'Hielo Claro', color: '#ADD8E6' },
      1: { id: 1, name: 'Hielo Oscuro', color: '#4682B4' },
    },
  },
  5: {
    id: 5,
    name: 'Pasto',
    type: 'GRASS',
    color: '#228B22',
    atlasPos: { x: 1, y: 0 },
    hardness: 20,
    variations: {
      0: { id: 0, name: 'Verde', color: '#37c237' },
      1: { id: 1, name: 'Otoñal', color: '#f37d2a' }, // Naranja
      2: { id: 2, name: 'Nevada', color: '#F0F8FF' }, // Blanco hielo
      3: { id: 3, name: 'Pantanosa', color: '#3e7a7a' } // Verde oscuro
    },
  },
  6: {
    id: 6,
    name: 'Oro',
    type: 'BASE',
    color: '#FFD700',
    hardness: 100,
    variations: {
      0: { id: 0, name: 'Brillante', color: '#FFD700' },
      1: { id: 1, name: 'Mate', color: '#B8860B' },
    },
  },
  7: {
      id: 7,
      name: 'Hierba Alta',
      type: 'PROP',
      propShape: 'PLANE',
      color: '#00ff6a',   
      hardness: 0,        
      atlasPos: { x: 0, y:  8}, 
      variations: {
      0: { id: 0, name: 'Verde', color: '#37c237' },
      1: { id: 1, name: 'Otoñal', color: '#f37d2a' }, // Naranja
      2: { id: 2, name: 'Nevada', color: '#F0F8FF' }, // Blanco hielo
      3: { id: 3, name: 'Pantanosa', color: '#3e7a7a' } // Verde oscuro
      }
  },
  8:{
      id: 8,
      name: 'Flor',
      type: 'PROP',
      propShape: 'PLANE',
      color: '#ffffff',   
      hardness: 0,        
      atlasPos: { x: 1, y:  8}, 
      variations: {
      0: { id: 0, name: 'Azul', color: '#3768c2' },
      1: { id: 1, name: 'Rojo', color: '#ad4032' }, // Naranja
      2: { id: 2, name: 'Violeta', color: '#b14cc5' }, // Blanco hielo
      3: { id: 3, name: 'Otoñal', color: '#f37d2a' }, // Naranja
      4: { id: 4, name: 'Nevada', color: '#F0F8FF' }, // Blanco hielo
      5: { id: 5, name: 'Pantanosa', color: '#3e7a7a' } // Verde oscuro
      }
  }
};

// Helper actualizado para obtener color específico
export const getMatColor = (matId: number, varId: number = 0) => {
  const material = MATERIALS_DB[matId];
  if (!material) return '#ff00ff';
  const variation = material.variations[varId];
  return variation ? variation.color : material.color;
};