// No published type declarations for these packages — declared as ambient
// modules (untyped) so TypeScript doesn't reject the dynamic imports in
// use-butterchurn.ts. Actual usage is defensively unwrapped/typed `any`
// there, since the real shape only matters at runtime.
declare module 'butterchurn';
declare module 'butterchurn-presets';
