export interface BackgroundLayer {
    id: string;
    texturePath: string;
    speed: number;       // Factor de movimiento (0.01 lento, 0.5 rápido)
    z: number;  
    scale?: [number, number];         // Profundidad en la escena
    frames?: number;    // Para animaciones tipo sprite
    fps?: number;       // Velocidad de animación en cuadros por segundo
    isSprite?: boolean; // Si es una animación tipo sprite
    columns?: number;     // Cuántos cuadros a lo ancho (ej. 5)
    rows?: number;        // Cuántos cuadros a lo alto (ej. 4)
    yOffset?: number;
    xPos?: number;      // Para ajustar la posición horizontal del sprite
    opacity?: number;
    is3D?: boolean;      
    isFluid?: boolean;
}

export const BIOMES_CONFIG: Record<string, BackgroundLayer[]> = {
    EDITOR: [
        {
            id: 'grid',
            texturePath: '/bg/editor/bg2.png',
            speed: 0.0001,
            z: -50,
            scale: [200, 120],
            opacity: 1
        },
    ],
    RIOT_GARDEN: [
        {
            id: 'sky',
            texturePath: '/bg/riot_garden/sky.jpg',
            speed: 0.0005,
            z: -60,
            scale: [200, 120]
        },
        {
            id: 'mountain',
            texturePath: '/bg/riot_garden/mountain.png',
            speed: 0.002,
            z: -40,
            scale: [200, 80],
            yOffset: -25
        },
        {
            id: 'mountain2',
            texturePath: '/bg/riot_garden/mountain2.png',
            speed: 0.001,
            z: -20,
            scale: [200, 40],
            yOffset: -35
        },
        {
            id: 'sun',
            texturePath: '/bg/riot_garden/sun.glb',
            speed: 0.0,
            z: -10,
            scale: [0.5, 0.5],
            yOffset: 20,
            opacity: 1,
            is3D: true
        }
    ],
    THE_VOID: [
        {
            id: 'void_sky',
            texturePath: '/bg/the_void/void_sky.png',
            speed: 0.0003,
            z: -60,
            scale: [200, 100],
            isFluid: true,
        }
    ]

};