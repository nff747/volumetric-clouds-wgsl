/**
 * Three.js Volumetric Cloud Sky Pass Adapter.
 * Integrates atmospheric cloud raymarching with Three.js camera pipelines and uniforms.
 */

import { CloudConfig, DEFAULT_CLOUD_CONFIG } from '../types';

export class ThreeCloudPass {
  public config: CloudConfig;
  public enabled: boolean = true;

  constructor(config?: Partial<CloudConfig>) {
    this.config = { ...DEFAULT_CLOUD_CONFIG, ...config };
  }

  /**
   * Generates custom vertex and fragment shaders for Three.js ShaderMaterial.
   */
  public getShaderDefinition(): {
    vertexShader: string;
    fragmentShader: string;
    uniforms: Record<string, { value: any }>;
  } {
    const vertexShader = /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 1.0, 1.0);
      }
    `;

    const fragmentShader = /* glsl */ `
      uniform float time;
      uniform float coverage;
      uniform float densityMultiplier;
      uniform vec3 sunDirection;
      uniform vec3 sunColor;
      uniform vec3 ambientColor;
      uniform mat4 invProjectionMatrix;
      uniform mat4 invViewMatrix;
      uniform vec3 cameraWorldPosition;

      varying vec2 vUv;

      float hash3(vec3 p) {
        vec3 q = fract(p * 0.1031);
        float d = dot(q, q.yzx + 33.33);
        return fract((q.x + q.y) * q.z + d);
      }

      float noise3D(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        vec3 u = f * f * (3.0 - 2.0 * f);

        return mix(
          mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), u.x),
              mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), u.x), u.y),
          mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), u.x),
              mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), u.x), u.y), u.z
        );
      }

      float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        vec3 pos = p;
        for (int i = 0; i < 4; i++) {
          v += a * noise3D(pos);
          pos = pos * 2.02;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 ndc = vUv * 2.0 - 1.0;
        vec4 clipPos = vec4(ndc, -1.0, 1.0);
        vec4 viewPos = invProjectionMatrix * clipPos;
        viewPos /= viewPos.w;

        vec3 worldDir = normalize((invViewMatrix * vec4(viewPos.xyz, 0.0)).xyz);
        vec3 rayOrigin = cameraWorldPosition;

        // Sky gradient background
        vec3 skyColor = mix(vec3(0.5, 0.7, 0.95), vec3(0.15, 0.35, 0.7), max(worldDir.y, 0.0));

        if (worldDir.y <= 0.01) {
          gl_FragColor = vec4(skyColor, 1.0);
          return;
        }

        float cloudBottom = 1500.0;
        float cloudTop = 4000.0;
        float tNear = max(0.0, (cloudBottom - rayOrigin.y) / worldDir.y);
        float tFar = (cloudTop - rayOrigin.y) / worldDir.y;

        if (tFar <= tNear) {
          gl_FragColor = vec4(skyColor, 1.0);
          return;
        }

        float cosTheta = dot(worldDir, normalize(sunDirection));
        float g1 = 0.82;
        float phase = 0.25 * (1.0 - g1*g1) / pow(1.0 + g1*g1 - 2.0*g1*cosTheta, 1.5);

        float transmittance = 1.0;
        vec3 cloudLight = vec3(0.0);
        float stepSize = 75.0;
        float currentT = tNear;

        for (int i = 0; i < 48; i++) {
          if (currentT >= tFar || transmittance < 0.02) break;

          vec3 pos = rayOrigin + worldDir * currentT;
          float h = (pos.y - cloudBottom) / (cloudTop - cloudBottom);
          float heightGrad = sin(h * 3.14159);

          vec3 samplePos = pos * 0.0006 + vec3(time * 0.02, 0.0, time * 0.01);
          float n = fbm(samplePos);
          float density = max(0.0, (n * heightGrad) - (1.0 - coverage)) * densityMultiplier;

          if (density > 0.005) {
            float lightTrans = exp(-density * 4.0);
            vec3 sunTerm = sunColor * lightTrans * phase;
            vec3 ambTerm = ambientColor * (0.6 + 0.4 * h);

            cloudLight += (sunTerm + ambTerm) * density * transmittance * stepSize * 0.15;
            transmittance *= exp(-density * stepSize * 0.04);
          }

          currentT += stepSize;
        }

        vec3 finalColor = mix(cloudLight, skyColor, transmittance);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    return {
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0.0 },
        coverage: { value: this.config.coverage },
        densityMultiplier: { value: this.config.densityMultiplier },
        sunDirection: { value: this.config.sunDirection },
        sunColor: { value: this.config.sunColor },
        ambientColor: { value: this.config.ambientColor },
        invProjectionMatrix: { value: null },
        invViewMatrix: { value: null },
        cameraWorldPosition: { value: [0, 0, 0] },
      }
    };
  }
}
