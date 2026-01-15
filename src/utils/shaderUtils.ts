/* eslint-disable @typescript-eslint/no-explicit-any */

// =====================================================================
// SHADER 1: SOLO TINTE (Para el bloque de pasto sólido)
// =====================================================================
export const patchSolidGrassMaterial = (shader: any) => {
  // 1. Definiciones
 shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `
    #include <common>
    varying float vMaskVal;     
    varying vec3 vInstanceColor;
    `
  );
  // 2. Capturar Color y Máscara (Vertex)
  shader.vertexShader = shader.vertexShader.replace(
    '#include <color_vertex>',
    `
    #include <color_vertex>
    vMaskVal = color.r;  
    
    #if defined(USE_INSTANCING_COLOR)
      vInstanceColor = instanceColor;
    #else
      vInstanceColor = vec3(1.0);
    #endif
    `
  );

  // 3. Aplicar Tinte (Fragment)
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `
    #include <common>
    varying float vMaskVal;
    varying vec3 vInstanceColor;
    `
  );

  // 4. Aplicar Tinte (Fragment)
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <color_fragment>',
    `
    vec4 diffuseColorOriginal = diffuseColor;
    vec3 tintColor = mix(vec3(1.0), vInstanceColor, vMaskVal);
    diffuseColor.rgb *= tintColor;
    
    diffuseColor.a = diffuseColorOriginal.a;
    `
  );
};


// =====================================================================
// SHADER 2: TINTE + VIENTO (Para hierba alta, flores - Props)
// =====================================================================
export const patchPropMaterial = (shader: any) => {
  shader.uniforms.uTime = { value: 0 };
  shader.uniforms.uWindStrength = { value: 0.1 }; 
  shader.uniforms.uWindSpeed = { value: 1.5 };

  // 1. Definiciones
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

  // 2. Capturar Color y Máscara
  shader.vertexShader = shader.vertexShader.replace(
    '#include <color_vertex>',
    `
    #include <color_vertex>
    vMaskVal = color.r;  

    #if defined(USE_INSTANCING_COLOR)
      vInstanceColor = instanceColor;
    #else
      vInstanceColor = vec3(1.0);
    #endif
    `
  );

  // 3. APLICAR VIENTO (Solo en este shader)
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `
    #include <begin_vertex>
    float heightFactor = max(0.0, transformed.y + 0.5); 

    #ifdef USE_INSTANCING
      float instanceX = instanceMatrix[3][0];
      float instanceZ = instanceMatrix[3][2];
    #else
      float instanceX = 0.0;
      float instanceZ = 0.0;
    #endif
    
    float wind = sin(uTime * uWindSpeed + instanceMatrix[3][0] * 0.5 + instanceMatrix[3][2] * 0.5);
    transformed.x += wind * uWindStrength * heightFactor * heightFactor; 
    `
  );

  // 4. Aplicar Tinte (Fragment)
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `
    #include <common>
    varying float vMaskVal;
    varying vec3 vInstanceColor;
    `
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <color_fragment>',
    `
    vec4 diffuseColorOriginal = diffuseColor;
    vec3 tintColor = mix(vec3(1.0), vInstanceColor, vMaskVal);
    diffuseColor.rgb *= tintColor;
    diffuseColor.a = diffuseColorOriginal.a;
    `
  );
  
  shader.userData = shader.uniforms; 
};