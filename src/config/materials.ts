
export interface MaterialDef {
  id: number;
  name: string;
  color: string;
  hardness: number; // Para el futuro sistema de destrucción
}

export const MATERIALS_DB: Record<number, MaterialDef> = {
  1: { id: 1, name: 'Tierra', color: '#8B5A2B', hardness: 10 },
  2: { id: 2, name: 'Piedra', color: '#9DA6B3', hardness: 50 },
  3: { id: 3, name: 'Ladrillo', color: '#A52A2A', hardness: 30 },
  4: { id: 4, name: 'Agua (Sólida)', color: '#1E90FF', hardness: 0 },
  5: { id: 5, name: 'Hierba', color: '#57D172', hardness: 5 },
  6: { id: 6, name: 'Oro', color: '#FFD700', hardness: 100 },
};

// Helper para obtener color rápido
export const getMatColor = (id: number) => MATERIALS_DB[id]?.color || '#ff00ff'; // Rosa si falta