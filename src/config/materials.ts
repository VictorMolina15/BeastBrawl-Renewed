
export interface MaterialVariation {
  id: number;
  name: string;
  color: string;
  textture?: string; // Ruta a la textura (opcional)
}

export interface MaterialDef {
  id: number;
  name: string;
  color: string; // Color base (fallback)
  hardness: number;
  variations: Record<number, MaterialVariation>; // <--- NUEVO
}

export const MATERIALS_DB: Record<number, MaterialDef> = {
  1: { 
    id: 1, 
    name: 'Tierra', 
    color: '#8B4513', 
    hardness: 10,
    variations: {
      0: { id: 0, name: 'Normal', color: '#8B4513' },
      1: { id: 1, name: 'Otoñal', color: '#D2691E' }, // Naranja
      2: { id: 2, name: 'Nevada', color: '#F0F8FF' }, // Blanco hielo
      3: { id: 3, name: 'Pantanosa', color: '#2F4F4F' } // Verde oscuro
    }
  },
  2: { 
    id: 2, name: 'Piedra', color: '#9DA6B3', hardness: 50,
    variations: {
      0: { id: 0, name: 'Normal', color: '#9DA6B3' },
      1: { id: 1, name: 'Musgosa', color: '#6B8E23' },
      2: { id: 2, name: 'Rugosa', color: '#708090' },
    }, 
  },
  3: { id: 3, name: 'Ladrillo', color: '#B22222', hardness: 30,
    variations: {
      0: { id: 0, name: 'Rojo', color: '#B22222' },
      1: { id: 1, name: 'Marrón', color: '#8B4513' },
      2: { id: 2, name: 'Blanco', color: '#F5F5F5' },
    },
   },
  4: { id: 4, name: 'Agua', color: '#ADD8E6', hardness: 0,
    variations: {
      0: { id: 0, name: 'Hielo Claro', color: '#ADD8E6' },
      1: { id: 1, name: 'Hielo Oscuro', color: '#4682B4' },
    },
   },
  5: { id: 5, name: 'Hierba', color: '#228B22', hardness: 5,
    variations: {
      0: { id: 0, name: 'Verde', color: '#228B22' },
      1: { id: 1, name: 'Seca', color: '#DEB887' },
    },
   },
  6: { id: 6, name: 'Oro', color: '#FFD700', hardness: 100,
    variations: {
      0: { id: 0, name: 'Brillante', color: '#FFD700' },
      1: { id: 1, name: 'Mate', color: '#B8860B' },
   },
  }
};

// Helper actualizado para obtener color específico
export const getMatColor = (matId: number, varId: number = 0) => {
  const material = MATERIALS_DB[matId];
  if (!material) return '#ff00ff';
  const variation = material.variations[varId];
  return variation ? variation.color : material.color;
};