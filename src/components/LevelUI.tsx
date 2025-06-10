import { useTerrainStore } from '../stores/useTerrainStore';

// Props que este componente recibirá de App.tsx
interface UIProps {
  isOrthographic: boolean;
  toggleCamera: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const MATERIALS: { [key: string]: number } = {
  'Tierra': 1,
  'Piedra': 2,
  'Rojo': 3,
  'Azul': 4,
  'Verde': 5,
  'Amarillo': 6,
};

export function UI({ isOrthographic, toggleCamera }: UIProps) {
 
  // Esto asegura que el componente solo se re-renderice si un valor específico cambia.
  const brushSize = useTerrainStore((state) => state.brushSize);
  const setBrushSize = useTerrainStore((state) => state.setBrushSize);
  const generateNewMap = useTerrainStore((state) => state.generateNewMap);
  const selectedMaterialId = useTerrainStore((state) => state.selectedMaterialId);
  const setSelectedMaterialId = useTerrainStore((state) => state.setSelectedMaterialId);

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: '10px',
      marginTop: '40px', // Para poder ver los FPS
      borderRadius: '8px',
      color: 'white',
      fontFamily: 'sans-serif',
      zIndex: 100, // Para que esté por encima del canvas
      width: '250px'
    }}>
      <h3>Panel de Control</h3>

      {/* 1. Ajustar tamaño del pincel */}
      <div style={{ margin: '10px 0px' }}>
        <label htmlFor="brushSize">Tamaño del Pincel: {brushSize}</label>
        <input
          type="range"
          id="brushSize"
          min="1"
          max="15"
          step="1"
          value={brushSize}
          onChange={(e) => setBrushSize(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* 2. Generar nuevo mapa */}
      <div style={{ marginBottom: '10px' }}>
        <button onClick={generateNewMap} style={{ width: '100%', padding: '8px' }}>
          Generar Nuevo Mapa
        </button>
      </div>

      {/* 3. Alternar perspectiva de cámara */}
      <div style={{ marginBottom: '10px' }}>
        <button onClick={toggleCamera} style={{ width: '100%', padding: '8px' }}>
          Cambiar a {isOrthographic ? 'Perspectiva' : 'Ortográfica'}
        </button>
      </div>

      {/* 4. Cambiar color de los cubos */}
      <div style={{ marginBottom: '10px' }}>
        <p>Material Actual:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {Object.entries(MATERIALS).map(([name, id]) => (
            <button 
              key={id} 
              onClick={() => setSelectedMaterialId(id)}
              style={{ 
                padding: '5px 10px',
                backgroundColor: selectedMaterialId === id ? 'dodgerblue' : '#555' 
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}