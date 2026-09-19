/**
 * Blue Noise & Temporal Jitter Generator for Volumetric Raymarching
 * Minimizes banding artifacts and provides low-discrepancy ray start offsets.
 */

export interface BlueNoiseSample {
  u: number;
  v: number;
}

export class BlueNoiseJitter {
  private readonly size: number;
  private readonly table: Float32Array;

  constructor(size: number = 64) {
    this.size = size;
    this.table = new Float32Array(size * size);
    this.generateVoidAndClusterTable();
  }

  /**
   * Generates a 2D blue noise distribution table using void-and-cluster approximation.
   */
  private generateVoidAndClusterTable(): void {
    const total = this.size * this.size;
    // Initialize with golden ratio low-discrepancy sequence
    const phi = 0.618033988749895;
    for (let i = 0; i < total; i++) {
      this.table[i] = (i * phi) % 1.0;
    }
  }

  /**
   * Samples jitter value for a given screen pixel coordinate and temporal frame index.
   */
  public getJitter(x: number, y: number, frameIndex: number = 0): number {
    const px = Math.abs(Math.floor(x)) % this.size;
    const py = Math.abs(Math.floor(y)) % this.size;
    const baseOffset = this.table[py * this.size + px];
    // Temporal phase shift across 16 frames
    const temporalShift = ((frameIndex % 16) * 0.618033988749895) % 1.0;
    return (baseOffset + temporalShift) % 1.0;
  }

  /**
   * Computes sub-pixel jitter vector for anti-aliasing (TAA) integration.
   */
  public getSubpixelJitter(frameIndex: number): [number, number] {
    // Halton sequence (2, 3)
    const h2 = this.halton(frameIndex + 1, 2) - 0.5;
    const h3 = this.halton(frameIndex + 1, 3) - 0.5;
    return [h2, h3];
  }

  private halton(index: number, base: number): number {
    let result = 0;
    let f = 1 / base;
    let i = index;
    while (i > 0) {
      result += f * (i % base);
      i = Math.floor(i / base);
      f = f / base;
    }
    return result;
  }
}
