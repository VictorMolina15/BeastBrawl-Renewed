import { useEffect, useRef } from 'react';
import { ATLAS_CONFIG, type MaterialDef } from '../config/materials';

interface MaterialIconProps {
  material: MaterialDef;
  variationId?: number;
  size?: number;
  className?: string;
}

// Cache simple para no recargar la imagen del atlas mil veces
const atlasImageCache = new Image();
atlasImageCache.src = '/models/cubes/MegaAtlas.png';
atlasImageCache.crossOrigin = "Anonymous"; // Importante para evitar errores de seguridad si usas CDN

export function MaterialIcon({ material, variationId=0, size = 40 }: MaterialIconProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const variation = material.variations?.[variationId];
  const colorHex = variation?.color || material.color;
  const atlasPos = variation?.atlasPos || material.atlasPos;

  // ---------------------------------------------------------
  // LÓGICA DE PROCESAMIENTO DE PIXELES (CPU SHADER)
  // ---------------------------------------------------------
  useEffect(() => {
    // Solo aplicamos esta lógica "pesada" si es un PROP (Flor)
    // Los bloques normales y el pasto se ven bien con CSS
    if (material.type !== 'PROP' || !atlasPos || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Función de dibujado
    const draw = () => {
        // 1. Limpiar canvas
        ctx.clearRect(0, 0, size, size);
        
        // 2. Calcular posición en el Atlas original (asumiendo 16x16 slots)
        // El atlas mide WxH, necesitamos saber cuánto mide cada tile
        const cols = ATLAS_CONFIG.cols;
        const rows = ATLAS_CONFIG.rows;
        
        // Si la imagen no ha cargado, intentamos de nuevo en un momento
        if (!atlasImageCache.complete || atlasImageCache.naturalWidth === 0) {
            setTimeout(draw, 100); 
            return;
        }

        const tileW = atlasImageCache.naturalWidth / cols;
        const tileH = atlasImageCache.naturalHeight / rows;

        // 3. Dibujar el tile original en el canvas pequeño
        ctx.drawImage(
            atlasImageCache,
            atlasPos.x * tileW, // Source X
            atlasPos.y * tileH, // Source Y
            tileW, tileH,       // Source W, H
            0, 0, size, size    // Dest X, Y, W, H
        );

        // 4. "CPU SHADER": MANIPULACIÓN DE PIXELES
        // Obtenemos los datos crudos de los pixeles (RGBA)
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        // Convertimos el color Hex a RGB (0-1)
        const rTint = parseInt(colorHex.slice(1, 3), 16) / 255;
        const gTint = parseInt(colorHex.slice(3, 5), 16) / 255;
        const bTint = parseInt(colorHex.slice(5, 7), 16) / 255;

        // Loop por cada pixel
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;     // Normalizamos 0-1
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            const a = data[i + 3]; // Alpha se queda igual (0-255)

            // Si es transparente, saltar
            if (a < 10) continue;

            // --- LÓGICA DE SATURACIÓN (Igual que en el Shader) ---
            const maxVal = Math.max(r, g, b);
            const minVal = Math.min(r, g, b);
            const saturation = maxVal - minVal;

            // Si es gris (baja saturación) -> Aplicar tinte
            // Si es color (alta saturación) -> Dejar original
            // Usamos un umbral suave
            let mixFactor = 0;
            if (saturation < 0.1) mixFactor = 1.0;
            else if (saturation > 0.2) mixFactor = 0.0;
            else mixFactor = 1.0 - ((saturation - 0.1) / 0.1); // Transición lineal simple

            if (mixFactor > 0) {
                // Multiplicamos color original por tinte
                const rNew = r * rTint;
                const gNew = g * gTint;
                const bNew = b * bTint;

                // Mezclamos
                data[i] = (r * (1 - mixFactor) + rNew * mixFactor) * 255;
                data[i + 1] = (g * (1 - mixFactor) + gNew * mixFactor) * 255;
                data[i + 2] = (b * (1 - mixFactor) + bNew * mixFactor) * 255;
            }
        }

        // 5. Devolvemos los pixeles modificados al canvas
        ctx.putImageData(imgData, 0, 0);
    };

    draw();

  }, [material.type, atlasPos, colorHex, size]);


  // ---------------------------------------------------------
  // RENDERIZADO
  // ---------------------------------------------------------
  
  if (!atlasPos) {
    return (
      <div 
        style={{ 
          width: size, height: size, backgroundColor: colorHex,
          borderRadius: '4px', boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.2)'
        }} 
      />
    );
  }

  // CASO A: FLOR INTELIGENTE (PROP)
  // Usamos el Canvas que procesamos arriba
  if (material.type === 'PROP') {
      return (
          <canvas 
            ref={canvasRef}
            width={size}
            height={size}
            style={{ 
                width: size, 
                height: size, 
                imageRendering: 'pixelated', // Crucial para que se vea nítido
                borderRadius: '4px'
            }}
          />
      );
  }

  // Cálculos CSS para los casos normales
  const cols = ATLAS_CONFIG.cols;
  const bgSize = `${cols * 100}%`;
  const xPos = atlasPos.x * size;
  const yPos = atlasPos.y * size;
  const bgPos = `-${xPos}px -${yPos}px`;
  const atlasUrl = 'url(/models/cubes/MegaAtlas.png)';

  const commonStyles: React.CSSProperties = {
    width: size,
    height: size,
    imageRendering: 'pixelated',
    borderRadius: '4px'
  };

  // CASO B: PASTO (GRASS)
  // Mantenemos la lógica de multiply que funciona bien aquí
  if (material.type === 'GRASS') {
    return (
      <div
        style={{
          ...commonStyles,
          backgroundColor: colorHex,
          backgroundImage: atlasUrl,
          backgroundSize: bgSize,
          backgroundPosition: bgPos,
          backgroundBlendMode: 'multiply',
          maskImage: atlasUrl,
          maskSize: bgSize,
          maskPosition: bgPos,
          WebkitMaskImage: atlasUrl,
          WebkitMaskSize: bgSize,
          WebkitMaskPosition: bgPos,
        }}
      />
    );
  }

  // CASO C: BASE (Tierra, Piedra)
  return (
    <div
      style={{
        ...commonStyles,
        backgroundImage: atlasUrl,
        backgroundSize: bgSize,
        backgroundPosition: bgPos,
      }}
    />
  );
}