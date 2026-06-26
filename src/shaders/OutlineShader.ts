// src/shaders/OutlineShader.ts
export const OutlineShader = (thickness: number = 0.04) => ({
  uniforms: {
    uThickness: { value: thickness },
  },
  vertexShader: `
    uniform float uThickness;
    void main() {
      // Usamos el centro local del objeto para escalar hacia afuera uniformemente
      vec3 pos = position * (1.0 + (uThickness * 2.0));
      
      // Transformación final
      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    void main() {
      // Simplemente pintamos el contorno de negro sólido
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
  `
});