// src/shaders/OutlineShader.ts
import * as THREE from 'three';

export const OutlineShader = (thickness: number = 0.04, pivotOffset: [number, number, number] = [0.0, 0.0, 0.0]) => ({
  uniforms: {
    uThickness: { value: thickness },
    uPivotOffset: { value: pivotOffset },
  },
  vertexShader: `
    uniform float uThickness;
    uniform vec3 uPivotOffset;

    void main() {
      // 1. Desplazamiento al pivote virtual
      vec3 localPos = position - uPivotOffset;
      
      // 2. Escalado hermético (no rompe la malla)
      localPos *= (1.0 + (uThickness * 2.0)); 
      
      // 3. Regreso a la posición original
      vec3 newPos = localPos + uPivotOffset;

      vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(newPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    void main() {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
  `,
  side: THREE.BackSide,
  depthWrite: false,
});