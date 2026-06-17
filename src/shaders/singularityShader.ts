export const SingularityShader = {
  uniforms: {
    uTexture: { value: null },
    uTime: { value: 0 },
    uSpeed: { value: 0.1 },       // Velocidad general de rotación
    uSwirl: { value: 8.0 },       // Qué tanto se tuerce en espiral hacia el centro
    uBrightness: { value: 1.0 }   // Control de brillo
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uTime;
    uniform float uSpeed;
    uniform float uSwirl;
    uniform float uBrightness;

    void main() {
      // 1. Movemos el centro de la imagen de (0,0) que es la esquina, a (0.5, 0.5) que es el centro real.
      vec2 centeredUv = vUv - 0.5;
      
      // 2. Calculamos la distancia al centro (Radio) y el Ángulo
      float radius = length(centeredUv);
      float angle = atan(centeredUv.y, centeredUv.x);
      
      // 3. LA MAGIA DEL VÓRTICE: 
      // Hacemos que gire con el tiempo, pero le sumamos una distorsión basada en el radio.
      // Entre más pequeño sea el radio (más cerca del centro), más se tuerce.
      float currentAngle = angle - (uTime * uSpeed) - (uSwirl * (1.0 - radius));
      
      // 4. Devolvemos las coordenadas de nuevo a X y Y
      vec2 finalUv = vec2(cos(currentAngle), sin(currentAngle)) * radius + 0.5;
      
      // 5. Muestreamos la textura con las nuevas coordenadas distorsionadas
      vec4 texColor = texture2D(uTexture, finalUv);
      vec4 finalColor = texColor * uBrightness;
      
      // 6. Corrección de color (La que nos dio el 100% de exactitud antes)
      gl_FragColor = vec4( mix(pow(finalColor.rgb, vec3(0.41666)) * 1.055 - 0.055, finalColor.rgb * 12.92, lessThanEqual(finalColor.rgb, vec3(0.0031308))), finalColor.a );
    }
  `
};