import { CPUReferenceClouds } from '../src/core/CPUReferenceClouds.js';
import { DEFAULT_CLOUD_CONFIG, CloudConfig } from '../src/types/index.js';

interface BenchResult {
  scenario: string;
  totalRays: number;
  maxSteps: number;
  elapsedMs: number;
  raysPerSec: number;
  avgStepsPerRay: number;
}

function runBenchmark(rayCount: number, maxSteps: number = 48, iterations: number = 3): BenchResult {
  const cfg: CloudConfig = {
    ...DEFAULT_CLOUD_CONFIG,
    maxSteps,
    lightSteps: 4,
  };

  const origins: [number, number, number][] = [];
  const directions: [number, number, number][] = [];

  for (let i = 0; i < rayCount; i++) {
    origins.push([0, 100, 0]);
    const elev = (15.0 + (i % 60) * 0.8) * (Math.PI / 180);
    const azim = ((i * 3.7) % 360) * (Math.PI / 180);
    directions.push([Math.cos(elev) * Math.sin(azim), Math.sin(elev), Math.cos(elev) * Math.cos(azim)]);
  }

  // Warmup
  CPUReferenceClouds.marchRay(origins[0], directions[0], cfg, 1.0);

  const start = performance.now();
  let totalSteps = 0;
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < rayCount; i++) {
      const res = CPUReferenceClouds.marchRay(origins[i], directions[i], cfg, 1.0 + iter * 0.1);
      if (iter === 0) totalSteps += res.stepsTaken;
    }
  }
  const totalElapsed = performance.now() - start;
  const avgElapsed = totalElapsed / iterations;

  return {
    scenario: `${rayCount} Rays (Steps=${maxSteps})`,
    totalRays: rayCount,
    maxSteps,
    elapsedMs: Number(avgElapsed.toFixed(2)),
    raysPerSec: Math.round((rayCount / (avgElapsed / 1000))),
    avgStepsPerRay: Number((totalSteps / rayCount).toFixed(1)),
  };
}

console.log('⚡ VOLUMETRIC CLOUDS RAYMARCHING BENCHMARK');
console.log('================================================================================');
console.log('| Scenario                  | Rays   | Steps/Ray | Elapsed (ms) | Rays / sec   |');
console.log('--------------------------------------------------------------------------------');

const testConfigs = [
  { rays: 50, steps: 32 },
  { rays: 100, steps: 48 },
  { rays: 200, steps: 64 },
];

for (const tc of testConfigs) {
  const b = runBenchmark(tc.rays, tc.steps, 2);
  console.log(
    `| ${b.scenario.padEnd(25)} | ${b.totalRays.toString().padStart(6)} | ${b.avgStepsPerRay.toFixed(1).padStart(9)} | ${b.elapsedMs.toFixed(2).padStart(12)} | ${b.raysPerSec.toLocaleString().padStart(12)} |`
  );
}

console.log('================================================================================');
console.log('✔ Benchmark completed successfully.');
