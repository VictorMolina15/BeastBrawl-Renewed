import { useTerrainStore } from '../stores/useTerrainStore';
import { MATERIALS_DB } from '../config/materials';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/LevelEditorUI.css';

interface UIProps {
  isOrthographic: boolean;
  toggleCamera: () => void;
}

export function UI({ isOrthographic, toggleCamera }: UIProps) {
  const brushSize = useTerrainStore((state) => state.brushSize);
  const setBrushSize = useTerrainStore((state) => state.setBrushSize);
  const generateNewMap = useTerrainStore((state) => state.generateNewMap);
  
  const selectedMaterialId = useTerrainStore((state) => state.selectedMaterialId);
  const selectedVariationId = useTerrainStore((state) => state.selectedVariationId);
  
  const openPopupId = useTerrainStore((state) => state.openPopupId);
  const setOpenPopupId = useTerrainStore((state) => state.setOpenPopupId);
  
  const setSelectedMaterialId = useTerrainStore((state) => state.setSelectedMaterialId);
  const setSelectedVariationId = useTerrainStore((state) => state.setSelectedVariationId);

  const toggleGrid = useTerrainStore((state) => state.toggleGrid); 
  const showGrid = useTerrainStore((state) => state.showGrid);     

  // Estado para guardar la posición exacta donde debe aparecer el popup
  const [popupPos, setPopupPos] = useState<{ top: number, left: number } | null>(null);

  const materials = Object.values(MATERIALS_DB);

  // 1. CALCULAMOS EL PORCENTAJE (Min 1, Max 10)
  const min = 1;
  const max = 10;
  const percentage = ((brushSize - min) / (max - min)) * 100;

  // Handler inteligente
  const handleTogglePopup = (matId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (openPopupId === matId) {
        setOpenPopupId(null);
        setPopupPos(null);
    } else {
        // Obtenemos las coordenadas del botón en la pantalla
        const rect = e.currentTarget.getBoundingClientRect();
        setOpenPopupId(matId);
        // Guardamos la posición: Centrado horizontalmente al botón, y arriba de él
        setPopupPos({
            top: rect.top, // La parte superior del botón
            left: rect.left + (rect.width / 2) // El centro del botón
        });
    }
  };

  const handleSelectMaterial = (matId: number) => {
      setSelectedMaterialId(matId);
      setOpenPopupId(null);
  };

  // Encontrar el material activo para el portal
  const activeMaterial = openPopupId ? MATERIALS_DB[openPopupId] : null;

  return (
    <>
      <div className="editor-hud">
        
        {/* 1. FILA PRINCIPAL */}
        <div className="hud-main-row">
          
          <div className="brush-section">
            <label className="brush-label">Tamaño del pincel: {brushSize}</label>
            
            {/* 2. APLICAMOS EL ESTILO DINÁMICO */}
            <input
              type="range"
              className="brush-slider"
              min={min}
              max={max}
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              style={{
                background: `linear-gradient(to right, 
                  #1e3a8a 0%, 
                  #3b82f6 ${percentage}%, 
                  #444 ${percentage}%, 
                  #444 100%)`
              }}
            />
          </div>

          <div className="materials-strip">
            {materials.map((mat) => {
              const isSelected = selectedMaterialId === mat.id;
              const isPopupOpen = openPopupId === mat.id;
              const hasVariations = mat.variations && Object.keys(mat.variations).length > 1;

              let previewColor = mat.color; // Por defecto: Color base
              
              if (isSelected) {
                  // Si este material está seleccionado, intentamos mostrar su variación activa
                  const activeVariation = mat.variations?.[selectedVariationId];
                  if (activeVariation) {
                      previewColor = activeVariation.color;
                  }
              }

              return (
                <div 
                  key={mat.id}
                  className={`mat-btn ${isSelected ? 'active' : ''} ${isPopupOpen ? 'popup-open' : ''}`}
                  onClick={() => handleSelectMaterial(mat.id)}
                >
                  <div className="mat-preview" style={{ backgroundColor: previewColor }} />
                  
                  <span className="mat-name">{mat.name}</span>

                  {hasVariations && (
                    <div 
                      className="popover-trigger"
                      onClick={(e) => handleTogglePopup(mat.id, e)}
                      title="Variaciones"
                    >
                      ⚙️
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. FILA INFERIOR */}
        <div className="hud-actions-row">
          <button 
            className="action-btn btn-purple" 
            onClick={(e) => {
              toggleCamera();
              e.currentTarget.blur();
            }}
          >
             {isOrthographic ? '3D' : '2D'}
          </button>
          
          <button 
            className="action-btn" 
            style={{ background: showGrid ? '#444' : '#222', border: '1px solid #555' }}
            onClick={(e) => {
              toggleGrid();
              e.currentTarget.blur();
            }}
          >
            {showGrid ? 'Ocultar Grid' : 'Mostrar Grid'}
          </button>

          <button 
            className="action-btn btn-orange" 
            onClick={(e) => {
              generateNewMap();
              e.currentTarget.blur();
            }}
          >
            Generar
          </button>
          <button className="action-btn btn-green" onClick={(e) => e.currentTarget.blur()}>Cargar</button>
          <button className="action-btn btn-blue" onClick={(e) => e.currentTarget.blur()}>Guardar</button>
        </div>
      </div>

      {/* --- PORTAL DEL POPUP (Fuera del flujo HTML normal) --- */}
      {/* Esto renderiza el div directamente en el <body> */}
      {activeMaterial && popupPos && createPortal(
        <div 
            className="variation-popup" 
            style={{ 
                top: popupPos.top, 
                left: popupPos.left 
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {Object.values(activeMaterial.variations).map((variation) => {
                const isActiveVar = selectedMaterialId === activeMaterial.id && selectedVariationId === variation.id;
                return (
                <div
                    key={variation.id}
                    className={`var-btn ${isActiveVar ? 'active-var' : ''}`}
                    style={{ backgroundColor: variation.color }}
                    title={variation.name}
                    onClick={() => {
                        setSelectedMaterialId(activeMaterial.id);
                        setSelectedVariationId(variation.id);
                        setOpenPopupId(null);
                    }}
                />
                );
            })}
        </div>,
        document.body
      )}
    </>
  );
}