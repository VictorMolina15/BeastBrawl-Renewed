declare module 'isosurface' {
  interface SurfaceNetsResult {
    positions: [number, number, number][];
    cells: [number, number, number][];
  }
  
  function surfaceNets(
    potential: (x: number, y: number, z: number) => number,
    dims: [number, number, number],
    bounds?: [[number, number, number], [number, number, number]]
  ): SurfaceNetsResult;

  export { surfaceNets };
}