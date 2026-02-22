/* eslint-disable @typescript-eslint/no-explicit-any */

export const patchPropMaterial = (shader: any) => {
  shader.uniforms.uTime = { value: 0 };
  shader.uniforms.uWindStrength = { value: 0.1 }; 
  shader.uniforms.uWindSpeed = { value: 1.5 };

  // 1. Inyectar Uniforms
  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `
    #include <common>
    uniform float uTime;
    uniform float uWindStrength;
    uniform float uWindSpeed;
    varying float vMaskVal;     
    varying vec3 vInstanceColor;
    `
  );

  // 2. Capturar Color
  shader.vertexShader = shader.vertexShader.replace(
    '#include <color_vertex>',
    `
    #include <color_vertex>
    
    #ifdef USE_COLOR
      vMaskVal = color.r;
    #else
      vMaskVal = 1.0;
    #endif

    #if defined(USE_INSTANCING_COLOR)
      vInstanceColor = instanceColor;
    #else
      vInstanceColor = vec3(1.0);
    #endif
    `
  );

  // 3. Billboard + Viento
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `
    #include <begin_vertex>
    
    // --- BILLBOARD ---
    vec3 instancePos = vec3(0.0);
    #ifdef USE_INSTANCING
       instancePos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
    #endif

    vec3 cameraDir = normalize(cameraPosition - instancePos);
    cameraDir.y = 0.0; 
    cameraDir = normalize(cameraDir);

    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 right = cross(up, cameraDir); 

    // --- VIENTO ---
    float heightFactor = max(0.0, transformed.y + 0.5); 
    float windOffset = instancePos.x * 0.5 + instancePos.z * 0.5;
    float wind = sin(uTime * uWindSpeed + windOffset);
    float displacement = wind * uWindStrength * heightFactor * heightFactor;
    
    transformed += right * displacement;
    transformed.y -= abs(displacement) * 0.2; 
    `
  );

  // 4. Fragment Setup (Saturación)
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `
    #include <common>
    varying float vMaskVal;
    varying vec3 vInstanceColor;

    float getSaturation(vec3 c) {
        float maxVal = max(max(c.r, c.g), c.b);
        float minVal = min(min(c.r, c.g), c.b);
        return maxVal - minVal; 
    }
    `
  );

  // 5. Tinte Inteligente
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <color_fragment>',
    `
    vec4 diffuseColorOriginal = diffuseColor; 
    
    // Detectar Saturación: Tallo verde (>0.2) vs Pétalo blanco (<0.1)
    float saturation = getSaturation(diffuseColorOriginal.rgb);
    
    // Máscara inversa: 1.0 si es blanco/gris, 0.0 si tiene color
    float tintFactor = 1.0 - smoothstep(0.0, 0.15, saturation);
    
    // Color teñido
    vec3 tintedRGB = diffuseColorOriginal.rgb * vInstanceColor;
    
    // Mezclar inteligente
    diffuseColor.rgb = mix(diffuseColorOriginal.rgb, tintedRGB, tintFactor * vMaskVal);
    
    diffuseColor.a = diffuseColorOriginal.a;
    `
  );
  
  shader.userData = shader.uniforms; 
};