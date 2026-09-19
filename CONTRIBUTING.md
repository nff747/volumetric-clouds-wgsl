# Contributing to Volumetric Clouds WGSL

Thank you for your interest in contributing!

## Development Guidelines

1. **Clean WGSL Kernels**: Keep compute shaders modular, well-commented, and aligned with standard W3C WebGPU specifications.
2. **Deterministic Optics**: Phase functions and scattering routines should match Mie / Henyey-Greenstein analytical models.
3. **Tests & Coverage**: All mathematical functions and coordinate routines must include Vitest unit tests under `tests/`.
4. **Zero-Overhead Memory**: Buffer uploads should minimize staging copies and leverage compact structs for uniform buffers.

## Running Tests

```bash
npm install
npm test
```

## Running the Demo

```bash
npm run dev
```
