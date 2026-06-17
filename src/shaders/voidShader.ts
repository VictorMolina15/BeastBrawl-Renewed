export const VoidShader = {
  uniforms: {
    uTexture: { value: null },
    uTime: { value: 0 },
    uFlowSpeed: { value: 0.25 },
    uDistortion: { value: .005 },
    uBrightness: { value: 1.0 },
    uSuction: { value: 0.5 },    // Qué tan fuerte absorbe el centro
    uColorSpeed: { value: 1.0 }  // Velocidad a la que cambian los colores
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
    uniform float uFlowSpeed;
    uniform float uDistortion;
    uniform float uBrightness;
    uniform float uSuction;
    uniform float uColorSpeed;

    // Funciones esenciales para rotar el Tono (Hue Shift)
    vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }

    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
      vec2 uv = vUv;
      float time = uTime * uFlowSpeed;
      
      // 1. EFECTO DE ABSORCIÓN (El pellizco gravitacional)
      vec2 center = vec2(0.5, 0.5);
      vec2 toCenter = uv - center;
      float dist = length(toCenter);
      float pull = exp(-dist * 4.0) * uSuction; 
      uv -= toCenter * pull; 
      
      // 2. ONDULEO DE GAS ORIGINAL
      float noiseX = sin(uv.y * 5.0 + time) * uDistortion;
      float noiseY = cos(uv.x * 5.0 + time * 0.8) * uDistortion;
      vec2 distortedUv = vec2(uv.x + noiseX, uv.y + noiseY);
      
      vec4 texColor = texture2D(uTexture, distortedUv);
      vec4 finalColor = texColor * uBrightness;

      // 3. CAMBIO DE COLOR DINÁMICO (Método de Tintado RGB)
      // Convertimos el seno (-1 a 1) en un valor de mezcla suave (0.0 a 1.0)
      float pulse = (sin(uTime * uColorSpeed) + 1.0) * 0.5;
      
      // Creamos dos "filtros" basados en tu color original:
      // pinkTint: Aumenta el rojo, reduce un pelín el verde para que no se vea amarillo.
      vec3 pinkTint = finalColor.rgb * vec3(1.20, 0.90, 1.00);
      
      // purpleTint: Aumenta el azul, reduce un pelín el rojo.
      vec3 purpleTint = finalColor.rgb * vec3(0.95, 0.90, 1.20);
      
      // La función mix() transiciona mágicamente entre ambos filtros.
      // Como multiplicamos por finalColor, el negro SIEMPRE se queda negro perfecto.
      finalColor.rgb = mix(purpleTint, pinkTint, pulse);

      // 4. CORRECCIÓN DE COLOR sRGB
      gl_FragColor = vec4( mix(pow(finalColor.rgb, vec3(0.41666)) * 1.055 - 0.055, finalColor.rgb * 12.92, lessThanEqual(finalColor.rgb, vec3(0.0031308))), finalColor.a );
    }
  `
};