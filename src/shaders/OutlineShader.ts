// src/shaders/OutlineShader.ts
export const OutlineShader = (thickness: number = 0.04) => ({
  uniforms: {
    uThickness: { value: thickness },
  },
  vertexShader: `
    uniform float thickness;

void main() {
    // 1. Encontramos el componente dominante de la normal (X, Y, o Z)
    // Para una cara plana será 1.0. Para una inclinada a 45° será ~0.707.
    float maxNorm = max(max(abs(normal.x), abs(normal.y)), abs(normal.z));
    
    // 2. Normalizamos la dirección de expansión.
    // Al dividir entre el componente mayor, compensamos la pérdida trigonométrica.
    // Esto obliga a la Rampa a salir de la geometría principal correctamente.
    vec3 expandDir = normal / (maxNorm + 0.0001); 

    float currentThickness = thickness;

    // 3. Grosor adicional dedicado para Trampas y Rampas.
    // Si la normal en Y no es completamente plana (1.0) ni nula (0.0), sabemos que es inclinada.
    if (abs(normal.y) > 0.01 && abs(normal.y) < 0.99) {
        currentThickness *= 1.5; // Sube este multiplicador si las Traps siguen viéndose delgadas
    }

    // 4. Aplicamos la expansión calculada
    vec3 newPos = position + (expandDir * currentThickness);

    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(newPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

}
  `,
  fragmentShader: `
    void main() {
      // Simplemente pintamos el contorno de negro sólido
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
  `,
});
