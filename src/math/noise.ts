/**
 * 3D Worley (Cellular) & Perlin Multi-Octave Noise Field Generators.
 * Synthesizes billowy fractal cumulus cloud shapes and fine boundary erosion.
 */

export class CloudNoise {
  /**
   * Hashes 3D integer coordinates to pseudo-random float vector [0, 1]^3.
   */
  public static hash33(ix: number, iy: number, iz: number): [number, number, number] {
    let x = (ix * 127.1 + iy * 311.7 + iz * 74.7) % 289.0;
    let y = (ix * 269.5 + iy * 183.3 + iz * 246.1) % 289.0;
    let z = (ix * 113.5 + iy * 271.9 + iz * 124.6) % 289.0;

    x = Math.sin(x) * 43758.5453;
    y = Math.sin(y) * 43758.5453;
    z = Math.sin(z) * 43758.5453;

    return [x - Math.floor(x), y - Math.floor(y), z - Math.floor(z)];
  }

  /**
   * 3D Worley (Voronoi F1) distance noise. Returns minimum distance to feature points.
   */
  public static worley3D(x: number, y: number, z: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);

    const fx = x - ix;
    const fy = y - iy;
    const fz = z - iz;

    let minDist = 1.0;

    for (let k = -1; k <= 1; k++) {
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const [rx, ry, rz] = this.hash33(ix + i, iy + j, iz + k);
          const dx = i + rx - fx;
          const dy = j + ry - fy;
          const dz = k + rz - fz;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < minDist) {
            minDist = dist;
          }
        }
      }
    }

    return minDist;
  }

  /**
   * Multi-octave inverted Worley noise (billowy cloud clumps).
   */
  public static worleyFBM(x: number, y: number, z: number, octaves: number = 3): number {
    let sum = 0.0;
    let freq = 1.0;
    let amp = 1.0;
    let totalAmp = 0.0;

    for (let i = 0; i < octaves; i++) {
      // Inverted Worley: 1.0 - dist creates pillowy center mounds
      const w = 1.0 - this.worley3D(x * freq, y * freq, z * freq);
      sum += w * amp;
      totalAmp += amp;
      freq *= 2.0;
      amp *= 0.5;
    }

    return sum / totalAmp;
  }

  /**
   * Evaluates cloud density at world position with coverage thresholding and erosion.
   */
  public static sampleCloudDensity(
    wx: number,
    wy: number,
    wz: number,
    coverage: number = 0.5,
    cloudBottom: number = 1500.0,
    cloudTop: number = 4000.0
  ): number {
    if (wy < cloudBottom || wy > cloudTop) return 0.0;

    // Scale world coordinates to noise frequency
    const scale = 0.0008;
    const baseNoise = this.worleyFBM(wx * scale, wy * scale, wz * scale, 3);

    // Height gradient attenuation
    const hNorm = (wy - cloudBottom) / (cloudTop - cloudBottom);
    const heightGrad = Math.sin(hNorm * Math.PI);

    // Coverage threshold subtraction
    const rawDensity = (baseNoise * heightGrad) - (1.0 - coverage);
    return Math.max(0.0, rawDensity / (coverage + 1e-4));
  }
}
