/* eslint-disable @typescript-eslint/no-explicit-any */
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
    #ifdef USE_INSTANCING
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