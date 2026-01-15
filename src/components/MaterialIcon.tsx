import { ATLAS_CONFIG, type MaterialDef } from '../config/materials';

interface MaterialIconProps {
  material: MaterialDef;
  variationId?: number; // Opcional, para mostrar tintes específicos
  size?: number; // Tamaño en px (ej. 40)
  className?: string;
}

export function MaterialIcon({ material, variationId = 0, size = 40, className = '' }: MaterialIconProps) {
  // 1. Obtener Datos
  const variation = material.variations?.[variationId];
  
  // Prioridad: AtlasPos de la variación > AtlasPos del material
  const atlasPos = variation?.atlasPos || material.atlasPos;
  
  // Prioridad: Color de la variación > Color del material
  const color = variation ? variation.color : material.color;

  // Si no hay atlasPos (ej. un material sólido sin textura), mostramos color plano
  if (!atlasPos) {
    return <div className={className} style={{ width: size, height: size, backgroundColor: color }} />;
  }

  // 2. Matemática del Sprite (CSS)
  // Calculamos la posición negativa para mover el Atlas
  // Asumimos que el Atlas tiene 32 columnas
  const cols = ATLAS_CONFIG.cols; // 32
  
  // El tamaño del background debe ser: (TamañoIcono * NumeroColumnas)
  // Ej: Si el icono es 40px y hay 32 cols, la imagen virtual es 1280px de ancho
  const bgSize = size * cols;
  
  const bgPosX = -(atlasPos.x * size);
  const bgPosY = -(atlasPos.y * size);

  return (
    <div 
      className={className}
      style={{
        width: size,
        height: size,
        backgroundColor: color, // 1. El color de fondo es el TINTE
        
        backgroundImage: 'url(/models/cubes/MegaAtlas.png)', // 2. La textura encima
        backgroundPosition: `${bgPosX}px ${bgPosY}px`,
        backgroundSize: `${bgSize}px`, // Ajusta el atlas al tamaño del icono
        backgroundRepeat: 'no-repeat',
        
        // 3. LA MAGIA: Mezclar Textura con Color
        // 'multiply': Lo blanco de la textura se vuelve del color de fondo. Lo negro se queda negro.
        // Si tu textura es a color (Tierra) y usas color blanco, se ve normal.
        backgroundBlendMode: 'multiply', 
        
        // Pixel Art nítido
        imageRendering: 'pixelated',
        borderRadius: '4px',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)' // Borde sutil interno
      }}
      title={`${material.name} - ${variation?.name || 'Normal'}`}
    />
  );
}