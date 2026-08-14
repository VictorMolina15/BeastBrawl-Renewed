import { useTerrainStore } from '../stores/useTerrainStore';
import { useCombatStore } from '../stores/useCombatStore';
import { MATERIALS_DB } from '../config/materials';
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MaterialIcon } from './MaterialIcon';
import { BIOMES_CONFIG } from '../config/backgrounds';
import '../styles/LevelEditorUI.css';

interface UIProps {
  isOrthographic: boolean;
  toggleCamera: () => void;
  cameraInfoRef: React.RefObject<HTMLDivElement>;
}

export function UI({ isOrthographic, toggleCamera, cameraInfoRef }: UIProps) {
  const appMode = useCombatStore((state) => state.appMode);
  const combatMode = useCombatStore((state) => state.mode);
  const selectedWeapon = useCombatStore((state) => state.selectedWeapon);
  const selectWeapon = useCombatStore((state) => state.selectWeapon);

  const undo = useTerrainStore((state) => state.undo);
  const redo = useTerrainStore((state) => state.redo);
  const saveLevel = useTerrainStore((state) => state.saveLevel);
  const loadLevel = useTerrainStore((state) => state.loadLevel);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const brushSize = useTerrainStore((state) => state.brushSize);
  const setBrushSize = useTerrainStore((state) => state.setBrushSize);
  const generateNewMap = useTerrainStore((state) => state.generateNewMap);
  const currentBiome = useTerrainStore((state) => state.currentBiome);
  const setBiome = useTerrainStore((state) => state.setBiome);

  const selectedMaterialId = useTerrainStore((state) => state.selectedMaterialId);
  const selectedVariationId = useTerrainStore((state) => state.selectedVariationId);

  const openPopupId = useTerrainStore((state) => state.openPopupId);
  const setOpenPopupId = useTerrainStore((state) => state.setOpenPopupId);

  const setSelectedMaterialId = useTerrainStore((state) => state.setSelectedMaterialId);
  const materialVariations = useTerrainStore((state) => state.materialVariations);
  const setMaterialVariation = useTerrainStore((state) => state.setMaterialVariation);

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
    {/* 1. INDICADOR SUPERIOR DE MODO */}
      <div 
        style={{
          position: 'fixed',
          left: '42%',
          backgroundColor: appMode === 'EDITOR' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(180, 20, 20, 0.85)',
          color: '#ffffff',
          padding: '8px 16px',
          margin: '8px',
          borderRadius: '20px',
          fontWeight: 'bold',
          fontSize: '12px',
          letterSpacing: '1px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(8px)',
          userSelect: 'none'
        }}
      >
        <span 
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: appMode === 'EDITOR' ? '#00ff88' : '#ffdd00',
            boxShadow: appMode === 'EDITOR' ? '0 0 8px #00ff88' : '0 0 8px #ffdd00',
            display: 'in-line-block',
          }}
        />
        {appMode === 'EDITOR' ? 'MODO: EDITOR (TAB para probar)' : `MODO: PRUEBA / COMBATE (${combatMode})`}
      </div>
      <div
        ref={cameraInfoRef}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.6)',
          color: 'rgb(180, 180, 180)',
          fontFamily: 'monospace',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          pointerEvents: 'none', // Para que los clicks lo traspasen
          whiteSpace: 'pre-line', // Permite saltos de línea
          zIndex: 1000
        }}
      >
        Cargando cámara...
      </div>
      {appMode === 'COMBAT' ? (
        /* --- ACCIONES DE COMBATE (VISUAL) --- */
        <div className="editor-hud" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '15px', flexDirection: 'row', justifyContent: 'center', gap: '12px', height:'10vh', padding: '10px 20px' }}>
          <button 
            className={`ui-btn ${selectedWeapon === 'MELEE' ? 'active' : ''}`}
            onClick={() => selectWeapon('MELEE')}
            style={{ padding: '10px 18px', fontSize: '14px', fontWeight: 'bold' }}
          >
            🥊 Ataque Melee <span style={{ opacity: 0.7, fontSize: '11px', marginLeft: '6px' }}>(Stamina: 1)</span>
          </button>

          <button 
            className={`ui-btn ${selectedWeapon === 'SLINGSHOT' ? 'active' : ''}`}
            onClick={() => selectWeapon('SLINGSHOT')}
            style={{ padding: '10px 18px', fontSize: '14px', fontWeight: 'bold' }}
          >
            🎯 Resortera <span style={{ opacity: 0.7, fontSize: '11px', marginLeft: '6px' }}>(Stamina: 2)</span>
          </button>

          <button 
            className={`ui-btn ${selectedWeapon === 'RPG' ? 'active' : ''}`}
            onClick={() => selectWeapon('RPG')}
            style={{ padding: '10px 18px', fontSize: '14px', fontWeight: 'bold' }}
          >
            🚀 RPG <span style={{ opacity: 0.7, fontSize: '11px', marginLeft: '6px' }}>(Stamina: 7)</span>
          </button>

          <button 
            className="ui-btn"
            style={{ 
              padding: '10px 18px', 
              fontSize: '14px', 
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #ff8c00, #e60000)',
              borderColor: '#ffaa00'
            }}
          >
            🔥 Movimiento Especial
          </button>
        </div>
      ) : (
      <div className="editor-hud">

        {/* FILA SUPERIOR */}
        <div className="hud-top-row">
          <button className="top-btn" onClick={() => undo()}>Undo</button>
          <button className="top-btn" onClick={() => redo()}>Redo</button>
        </div>

        {/*FILA PRINCIPAL */}
        <div className="hud-main-row">

          <div className="control-group">
            <label>Fondo:</label>
            <select
              value={currentBiome}
              onChange={(e) => setBiome(e.target.value)}
              className="biome-select"
            >
              {Object.keys(BIOMES_CONFIG).map(biomeKey => (
                <option key={biomeKey} value={biomeKey}>
                  {biomeKey.replace('_', ' ')}
                </option>
              ))}
            </select>


            <div className="brush-section">
              <label className="brush-label">Tamaño del pincel: {brushSize}</label>

              {/* APLICAMOS EL ESTILO DINÁMICO */}
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
          </div>

          <div className="materials-strip">
            {materials.map((mat) => {
              const savedVariation = materialVariations[mat.id] || 0;
              const isSelected = selectedMaterialId === mat.id;
              const isPopupOpen = openPopupId === mat.id;
              const hasVariations = mat.variations && Object.keys(mat.variations).length > 1;

              return (
                <div
                  key={mat.id}
                  className={`mat-btn ${isSelected ? 'active' : ''} ${isPopupOpen ? 'popup-open' : ''}`}
                  onClick={() => handleSelectMaterial(mat.id)}
                >
                  <div className="mat-preview-container">
                    <MaterialIcon
                      material={mat}
                      variationId={savedVariation}
                      size={32}
                    />
                  </div>

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

        {/* FILA INFERIOR */}
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
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json"
            onChange={(e) => {
              if (e.target.files?.[0]) loadLevel(e.target.files[0]);
              e.target.value = ""; // Reset para permitir cargar el mismo archivo
            }}
          />

          <button
            className="action-btn btn-green"
            onClick={() => fileInputRef.current?.click()}
          >
            Cargar
          </button>

          <button
            className="action-btn btn-blue"
            onClick={saveLevel}
          >
            Guardar
          </button>
        </div>
      </div>
      )}

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
            // Checamos si esta variación es la activa
            const isActiveVar = selectedMaterialId === activeMaterial.id && selectedVariationId === variation.id;

            return (
              <div
                key={variation.id}
                // Mantenemos la clase 'var-btn' para el layout y 'active-var' para el borde blanco
                className={`var-btn ${isActiveVar ? 'active-var' : ''}`}

                // Tooltip nativo
                title={variation.name}

                // Evento de click para seleccionar
                onClick={() => {
                  setMaterialVariation(activeMaterial.id, variation.id);
                  setSelectedMaterialId(activeMaterial.id);
                  setOpenPopupId(null); // Cierra el popup al elegir
                }}
              >
                {/* ÚNICO CONTENIDO: El Icono con Textura + Tinte */}
                <MaterialIcon
                  material={activeMaterial}
                  variationId={variation.id}
                  size={40}
                />
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}