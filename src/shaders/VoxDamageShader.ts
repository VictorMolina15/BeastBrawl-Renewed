/* eslint-disable @typescript-eslint/no-explicit-any */
export function patchDamageMaterial(shader: any) {
  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
     attribute float aDamageStage;
     varying float vDamageStage;
     varying vec2 vWorldPos;
    `
  );
  shader.vertexShader = shader.vertexShader.replace(
    '#include <uv_vertex>',
    `#include <uv_vertex>
     vDamageStage = aDamageStage;
     #ifdef USE_INSTANCING
       vWorldPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xy;
     #else
       vWorldPos = (modelMatrix * vec4(position, 1.0)).xy;
     #endif
    `
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `#include <common>
     varying float vDamageStage;
     varying vec2 vWorldPos;

     vec2 hash2(vec2 p) {
       return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
     }
     
     float voronoiCracks(vec2 p) {
       vec2 n = floor(p);
       vec2 f = fract(p);
       float md1 = 8.0;
       float md2 = 8.0;
       
       for(int j = -1; j <= 1; j++) {
         for(int i = -1; i <= 1; i++) {
           vec2 g = vec2(float(i), float(j));
           vec2 o = hash2(n + g);
           vec2 r = g + o - f;
           float d = dot(r, r);
           if (d < md1) {
             md2 = md1;
             md1 = d;
           } else if (d < md2) {
             md2 = d;
           }
         }
       }
       
       float edgeDist = sqrt(md2) - sqrt(md1);
       return 1.0 - step(0.05, edgeDist);
     }
    `
  );

  const damageCodeDiffuse = `
     if (vDamageStage > 0.0) {
        float finalCrackOpacity = 0.0;
        
        for(float i = 1.0; i <= 4.0; i++) {
           if (vDamageStage >= i) {
              // 1. TURBULENCIA ESTILO RELÁMPAGO (FBM Básico)
              // Combinamos una onda lenta (12.0) con una onda muy rápida (40.0)
              vec2 turbulencia = vec2(
                  sin(vWorldPos.y * 1.0) * 0.015 + cos(vWorldPos.y * 15.0) * 0.01,
                  cos(vWorldPos.x * 1.0) * 0.015 + sin(vWorldPos.x * 15.0) * 0.01
              );
              
              // 2. Aplicamos la turbulencia a la posición
              vec2 distortedPos = vWorldPos + turbulencia;
              
              // 3. Calculamos la grieta usando la posición distorsionada
              float crackShape = voronoiCracks(distortedPos * 1.2 + (i * 12.34));
              
              float layerOpacity = 0.2 + (i * 0.2); 
              finalCrackOpacity = max(finalCrackOpacity, crackShape * layerOpacity);
           }
        }
        
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.0), finalCrackOpacity);
     }
  `;

  const damageCodeFragColor = `
     if (vDamageStage > 0.0) {
        float finalCrackOpacity = 0.0;
        
        for(float i = 1.0; i <= 4.0; i++) {
           if (vDamageStage >= i) {
              // 1. TURBULENCIA ESTILO RELÁMPAGO (FBM Básico)
              // Combinamos una onda lenta (12.0) con una onda muy rápida (40.0)
              vec2 turbulencia = vec2(
                  sin(vWorldPos.y * 1.0) * 0.015 + cos(vWorldPos.y * 15.0) * 0.01,
                  cos(vWorldPos.x * 1.0) * 0.015 + sin(vWorldPos.x * 15.0) * 0.01
              );
              
              // 2. Aplicamos la turbulencia a la posición
              vec2 distortedPos = vWorldPos + turbulencia;
              
              // 3. Calculamos la grieta usando la posición distorsionada
              float crackShape = voronoiCracks(distortedPos * 1.2 + (i * 12.34));
              
              float layerOpacity = 0.2 + (i * 0.2); 
              finalCrackOpacity = max(finalCrackOpacity, crackShape * layerOpacity);
           }
        }
        
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0), finalCrackOpacity);
     }
  `;

  if (shader.fragmentShader.includes('#include <color_fragment>')) {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       ${damageCodeDiffuse}
      `
    );
  } else if (shader.fragmentShader.includes('#include <dithering_fragment>')) {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
       ${damageCodeFragColor}
       #include <dithering_fragment>
      `
    );
  }
}