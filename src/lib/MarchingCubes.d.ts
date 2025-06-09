import { BufferGeometry, Material, Vector3 } from 'three';

// Esta es la "instrucción" correcta para TypeScript sobre cómo funciona la clase.
export class MarchingCubes extends BufferGeometry {
  constructor(resolution: number, material?: Material, enableUvs?: boolean, enableColors?: boolean);

  isolevel: number;
  field: Uint8Array; // La clase espera un array de datos en esta propiedad.

  // Estas son las propiedades que la clase llena con el resultado.
  vertices: Vector3[];
  faces: number[][];
  
  // Este es el método que ejecuta el algoritmo.
  update(isolevel?: number): void;
  reset(): void;
}