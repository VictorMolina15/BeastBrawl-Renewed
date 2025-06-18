// src/lib/MarchingCubesUtils.ts
import { edgeTable, triTable } from './marchingCubesTables';

// interpolateVertex no cambia
function interpolateVertex(p1: number[], p2: number[], val1: number, val2: number, isolevel: number): [number, number, number] {
  if (Math.abs(isolevel - val1) < 0.00001) return [p1[0], p1[1], p1[2]];
  if (Math.abs(isolevel - val2) < 0.00001) return [p2[0], p2[1], p2[2]];
  if (Math.abs(val1 - val2) < 0.00001) return [p1[0], p1[1], p1[2]];
  
  const mu = (isolevel - val1) / (val2 - val1);
  return [
    p1[0] + mu * (p2[0] - p1[0]),
    p1[1] + mu * (p2[1] - p1[1]),
    p1[2] + mu * (p2[2] - p1[2]),
  ];
}

// Ahora acepta las dimensiones como un array [width, height, depth]
export function generateMarchingCubesMesh(data: Uint8Array, dims: [number, number, number]) {
  const [width, height, depth] = dims;
  const vertices: number[] = [];
  const indices: number[] = [];
  const isolevel = 0.5;

  const scalarField = new Float32Array(data.length);
  for(let i = 0; i < data.length; i++) {
    scalarField[i] = data[i] === 0 ? 1 : 0; 
  }

  const getVoxel = (x: number, y: number, z: number) => {
    // Ya no necesitamos la comprobación de límites aquí, porque los datos ya vienen "rellenos"
    return scalarField[z * width * height + y * width + x];
  };

  // Los bucles ahora usan las dimensiones del array de datos con relleno
  for (let z = 0; z < depth - 1; z++) {
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        
        const p = [x, y, z];
        const gridcells = [
          { p: [p[0], p[1], p[2]], val: getVoxel(x, y, z) },
          { p: [p[0] + 1, p[1], p[2]], val: getVoxel(x + 1, y, z) },
          { p: [p[0] + 1, p[1], p[2] + 1], val: getVoxel(x + 1, y, z + 1) },
          { p: [p[0], p[1], p[2] + 1], val: getVoxel(x, y, z + 1) },
          { p: [p[0], p[1] + 1, p[2]], val: getVoxel(x, y + 1, z) },
          { p: [p[0] + 1, p[1] + 1, p[2]], val: getVoxel(x + 1, y + 1, z) },
          { p: [p[0] + 1, p[1] + 1, p[2] + 1], val: getVoxel(x + 1, y + 1, z + 1) },
          { p: [p[0], p[1] + 1, p[2] + 1], val: getVoxel(x, y + 1, z + 1) },
        ];
        
        let cubeIndex = 0;
        if (gridcells[0].val < isolevel) cubeIndex |= 1;
        if (gridcells[1].val < isolevel) cubeIndex |= 2;
        if (gridcells[2].val < isolevel) cubeIndex |= 4;
        if (gridcells[3].val < isolevel) cubeIndex |= 8;
        if (gridcells[4].val < isolevel) cubeIndex |= 16;
        if (gridcells[5].val < isolevel) cubeIndex |= 32;
        if (gridcells[6].val < isolevel) cubeIndex |= 64;
        if (gridcells[7].val < isolevel) cubeIndex |= 128;

        if (edgeTable[cubeIndex] === 0) continue;

        const vertList: Array<[number, number, number] | undefined> = Array(12);

        if (edgeTable[cubeIndex] & 1) vertList[0] = interpolateVertex(gridcells[0].p, gridcells[1].p, gridcells[0].val, gridcells[1].val, isolevel);
        if (edgeTable[cubeIndex] & 2) vertList[1] = interpolateVertex(gridcells[1].p, gridcells[2].p, gridcells[1].val, gridcells[2].val, isolevel);
        if (edgeTable[cubeIndex] & 4) vertList[2] = interpolateVertex(gridcells[2].p, gridcells[3].p, gridcells[2].val, gridcells[3].val, isolevel);
        if (edgeTable[cubeIndex] & 8) vertList[3] = interpolateVertex(gridcells[3].p, gridcells[0].p, gridcells[3].val, gridcells[0].val, isolevel);
        if (edgeTable[cubeIndex] & 16) vertList[4] = interpolateVertex(gridcells[4].p, gridcells[5].p, gridcells[4].val, gridcells[5].val, isolevel);
        if (edgeTable[cubeIndex] & 32) vertList[5] = interpolateVertex(gridcells[5].p, gridcells[6].p, gridcells[5].val, gridcells[6].val, isolevel);
        if (edgeTable[cubeIndex] & 64) vertList[6] = interpolateVertex(gridcells[6].p, gridcells[7].p, gridcells[6].val, gridcells[7].val, isolevel);
        if (edgeTable[cubeIndex] & 128) vertList[7] = interpolateVertex(gridcells[7].p, gridcells[4].p, gridcells[7].val, gridcells[4].val, isolevel);
        if (edgeTable[cubeIndex] & 256) vertList[8] = interpolateVertex(gridcells[0].p, gridcells[4].p, gridcells[0].val, gridcells[4].val, isolevel);
        if (edgeTable[cubeIndex] & 512) vertList[9] = interpolateVertex(gridcells[1].p, gridcells[5].p, gridcells[1].val, gridcells[5].val, isolevel);
        if (edgeTable[cubeIndex] & 1024) vertList[10] = interpolateVertex(gridcells[2].p, gridcells[6].p, gridcells[2].val, gridcells[6].val, isolevel);
        if (edgeTable[cubeIndex] & 2048) vertList[11] = interpolateVertex(gridcells[3].p, gridcells[7].p, gridcells[3].val, gridcells[7].val, isolevel);

        const tableIndex = cubeIndex * 16;
        for (let i = 0; triTable[tableIndex + i] !== -1; i += 3) {
            const i1 = triTable[tableIndex + i];
            const i2 = triTable[tableIndex + i + 1];
            const i3 = triTable[tableIndex + i + 2];

            const v1 = vertList[i1];
            const v2 = vertList[i2];
            const v3 = vertList[i3];

            if (v1 && v2 && v3) {
              const base_idx = vertices.length / 3;
              // --- CORRECCIÓN CLAVE AQUÍ ---
              // Restamos 1 para compensar el relleno y mantener la malla en el origen local del chunk
              vertices.push(v1[0] - 1, v1[1] - 1, v1[2] - 1);
              vertices.push(v2[0] - 1, v2[1] - 1, v2[2] - 1);
              vertices.push(v3[0] - 1, v3[1] - 1, v3[2] - 1);

              indices.push(base_idx, base_idx + 1, base_idx + 2);
            }
        }
      }
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(indices),
  };
}