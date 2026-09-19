/**
 * WGSL Volumetric Cloudscapes & Atmospheric Raymarching Compute Shader.
 * Raymarches 3D noise densities with dual-lobe Henyey-Greenstein phase scattering and light-cone self-shadowing.
 */

export const cloudMarchShader = /* wgsl */ `
struct CloudUniforms {
  viewportSize: vec2<f32>,
  time: f32,
  coverage: f32,
  cloudBottom: f32,
  cloudTop: f32,
  densityMultiplier: f32,
  maxSteps: u32,
  lightSteps: u32,
  stepSize: f32,
  sunDir: vec3<f32>,
  camPos: vec3<f32>,
  invProj: mat4x4<f32>,
  invView: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: CloudUniforms;
@group(0) @binding(1) var outColorTex: texture_storage_2d<rgba16float, write>;

const PI: f32 = 3.141592653589793;

// Pseudo-random hash for noise
fn hash3(p: vec3<f32>) -> f32 {
  let q = fract(p * 0.1031);
  let d = dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z + d);
}

// 3D Value Noise
fn noise3D(p: vec3<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash3(i + vec3<f32>(0.0, 0.0, 0.0)), hash3(i + vec3<f32>(1.0, 0.0, 0.0)), u.x),
      mix(hash3(i + vec3<f32>(0.0, 1.0, 0.0)), hash3(i + vec3<f32>(1.0, 1.0, 0.0)), u.x),
      u.y
    ),
    mix(
      mix(hash3(i + vec3<f32>(0.0, 0.0, 1.0)), hash3(i + vec3<f32>(1.0, 0.0, 1.0)), u.x),
      mix(hash3(i + vec3<f32>(0.0, 1.0, 1.0)), hash3(i + vec3<f32>(1.0, 1.0, 1.0)), u.x),
      u.y
    ),
    u.z
  );
}

// Multi-octave FBM noise
fn fbm(p: vec3<f32>) -> f32 {
  var v = 0.0;
  var a = 0.5;
  var pos = p;
  for (var i = 0; i < 4; i = i + 1) {
    v = v + a * noise3D(pos);
    pos = pos * 2.02;
    a = a * 0.5;
  }
  return v;
}

// Sample cloud density at world coordinate pos
fn sampleCloud(pos: vec3<f32>, uniforms: CloudUniforms) -> f32 {
  if (pos.y < uniforms.cloudBottom || pos.y > uniforms.cloudTop) {
    return 0.0;
  }

  let h = (pos.y - uniforms.cloudBottom) / (uniforms.cloudTop - uniforms.cloudBottom);
  let heightGrad = sin(h * PI);

  let p = pos * 0.0006 + vec3<f32>(uniforms.time * 0.02, 0.0, uniforms.time * 0.01);
  let baseNoise = fbm(p);

  let rawDensity = (baseNoise * heightGrad) - (1.0 - uniforms.coverage);
  return max(0.0, rawDensity) * uniforms.densityMultiplier;
}

// Dual-lobe Henyey-Greenstein phase function
fn henyeyGreenstein(cosTheta: f32, g: f32) -> f32 {
  let g2 = g * g;
  return (1.0 / (4.0 * PI)) * ((1.0 - g2) / pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
}

fn dualPhase(cosTheta: f32) -> f32 {
  let fwd = henyeyGreenstein(cosTheta, 0.82);
  let bwd = henyeyGreenstein(cosTheta, -0.22);
  return 0.75 * fwd + 0.25 * bwd;
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let coords = vec2<i32>(id.xy);
  let dims = vec2<i32>(uniforms.viewportSize);

  if (coords.x >= dims.x || coords.y >= dims.y) {
    return;
  }

  // Normalized Device Coordinates
  let uv = (vec2<f32>(coords) + 0.5) / uniforms.viewportSize;
  let ndc = vec2<f32>(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);

  // Reconstruct view ray
  let clipPos = vec4<f32>(ndc, -1.0, 1.0);
  var viewPos = uniforms.invProj * clipPos;
  viewPos = viewPos / viewPos.w;
  let worldDir = normalize((uniforms.invView * vec4<f32>(viewPos.xyz, 0.0)).xyz);
  let rayOrigin = uniforms.camPos;

  // Intersect with horizontal cloud layer [cloudBottom, cloudTop]
  if (worldDir.y <= 0.001) {
    // Looking below cloud horizon
    textureStore(outColorTex, coords, vec4<f32>(0.0, 0.0, 0.0, 0.0));
    return;
  }

  let tNear = max(0.0, (uniforms.cloudBottom - rayOrigin.y) / worldDir.y);
  let tFar = (uniforms.cloudTop - rayOrigin.y) / worldDir.y;

  if (tFar <= tNear) {
    textureStore(outColorTex, coords, vec4<f32>(0.0, 0.0, 0.0, 0.0));
    return;
  }

  let cosTheta = dot(worldDir, uniforms.sunDir);
  let phase = dualPhase(cosTheta);

  var transmittance = 1.0;
  var accumulatedLight = vec3<f32>(0.0);

  let stepSize = min(uniforms.stepSize, (tFar - tNear) / f32(uniforms.maxSteps));
  var currentT = tNear;

  let nSteps = uniforms.maxSteps;
  for (var s = 0u; s < nSteps; s = s + 1u) {
    if (currentT >= tFar || transmittance < 0.01) {
      break;
    }

    let pos = rayOrigin + worldDir * currentT;
    let density = sampleCloud(pos, uniforms);

    if (density > 0.001) {
      // Secondary light march cone towards sun
      var lightOpticalDepth = 0.0;
      let lightStep = 60.0;
      for (var l = 1u; l <= uniforms.lightSteps; l = l + 1u) {
        let lightPos = pos + uniforms.sunDir * (f32(l) * lightStep);
        lightOpticalDepth = lightOpticalDepth + sampleCloud(lightPos, uniforms) * lightStep;
      }

      // Beer-Lambert light attenuation with powder sugar effect
      let lightTrans = exp(-lightOpticalDepth * 0.04) * (1.0 - exp(-lightOpticalDepth * 0.08));
      let sunLight = vec3<f32>(1.2, 1.1, 0.95) * lightTrans * phase;
      let ambient = vec3<f32>(0.25, 0.35, 0.55) * (0.6 + 0.4 * ((pos.y - uniforms.cloudBottom) / (uniforms.cloudTop - uniforms.cloudBottom)));

      let stepOpticalDepth = density * stepSize * 0.035;
      let stepTrans = exp(-stepOpticalDepth);

      accumulatedLight = accumulatedLight + (sunLight + ambient) * density * transmittance * stepSize;
      transmittance = transmittance * stepTrans;
    }

    currentT = currentT + stepSize;
  }

  let alpha = 1.0 - transmittance;
  textureStore(outColorTex, coords, vec4<f32>(accumulatedLight, alpha));
}
`;
