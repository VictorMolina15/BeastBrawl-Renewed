import * as THREE from 'three';

export const OutlineShader = (thickness: number = 0.04, pivotOffset: [number, number, number] = [0.0, 0.0, 0.0], scaleAxis: [number, number, number] = [1.0, 1.0, 1.0]) => ({
  uniforms: {
    uThickness: { value: thickness },
    uPivotOffset: { value: pivotOffset },
    uScaleAxis: { value: scaleAxis } // NUEVO: Controla en qué ejes crece el borde
  },
  vertexShader: `
    uniform float uThickness;
    uniform vec3 uPivotOffset;
    uniform vec3 uScaleAxis;

    void main() {
      vec4 mvPosOriginal = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      bool isOrtho = projectionMatrix[2][3] == 0.0;
      float distanceScale;
      
      if (isOrtho) {
        distanceScale = (1.0 / projectionMatrix[1][1]) * 0.1; 
      } else {
        float dist = length(mvPosOriginal.xyz);
        distanceScale = clamp(dist * 0.04, 0.4, 3.5);
      }

      float dynamicThickness = uThickness * distanceScale;

      vec3 localPos = position - uPivotOffset;
      
      // MAGIA: El bloque solo crecerá en los ejes donde uScaleAxis sea 1.0
      vec3 scaleVec = vec3(1.0) + (uScaleAxis * dynamicThickness * 3.5);
      localPos *= scaleVec; 
      
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
  polygonOffset: true,
  polygonOffsetFactor: 4.0,
  polygonOffsetUnits: 4.0
});