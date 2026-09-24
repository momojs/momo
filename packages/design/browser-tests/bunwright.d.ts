// bunwright 0.3.1 points its `types` field at a missing dist/types.d.ts.
// Reuse the declarations it actually ships, scoped to the test project.
declare module 'bunwright' {
  export { browser } from 'bunwright/dist/index';
}
