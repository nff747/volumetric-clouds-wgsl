/**
 * WebGPU Volumetric Cloudscapes Coordinator.
 * Manages compute passes, camera matrix transformations, and volumetric raymarching dispatches.
 */

import { CloudConfig, DEFAULT_CLOUD_CONFIG } from '../types';

export class CloudRenderer {
  public device: GPUDevice | null;
  public config: CloudConfig;

  constructor(device: GPUDevice | null = null, config?: Partial<CloudConfig>) {
    this.device = device;
    this.config = { ...DEFAULT_CLOUD_CONFIG, ...config };
  }

  /**
   * Updates runtime cloud configuration parameters.
   */
  public updateConfig(newConfig: Partial<CloudConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Packs uniforms into a Float32Array suitable for WebGPU uniform buffer binding.
   * Matches WGSL CloudUniforms struct layout (including 4x4 matrix inversions).
   */
  public buildUniformData(
    width: number,
    height: number,
    time: number,
    camPos: [number, number, number],
    invProj: Float32Array,
    invView: Float32Array
  ): Float32Array {
    // 64 floats total (scalars + vectors + 2x 16-float 4x4 matrices)
    const buffer = new Float32Array(64);
    buffer[0] = width;
    buffer[1] = height;
    buffer[2] = time;
    buffer[3] = this.config.coverage;

    buffer[4] = this.config.cloudBottom;
    buffer[5] = this.config.cloudTop;
    buffer[6] = this.config.densityMultiplier;

    const u32View = new Uint32Array(buffer.buffer);
    u32View[7] = this.config.maxSteps;
    u32View[8] = this.config.lightSteps;

    buffer[9] = this.config.stepSize;
    // buffer[10], buffer[11] padding

    // sunDir (vec3 at offset 12)
    buffer[12] = this.config.sunDirection[0];
    buffer[13] = this.config.sunDirection[1];
    buffer[14] = this.config.sunDirection[2];
    // buffer[15] padding

    // camPos (vec3 at offset 16)
    buffer[16] = camPos[0];
    buffer[17] = camPos[1];
    buffer[18] = camPos[2];
    // buffer[19] padding

    // invProj matrix (16 floats at offset 20)
    for (let i = 0; i < 16; i++) {
      buffer[20 + i] = invProj[i];
    }

    // invView matrix (16 floats at offset 36)
    for (let i = 0; i < 16; i++) {
      buffer[36 + i] = invView[i];
    }

    return buffer;
  }
}
