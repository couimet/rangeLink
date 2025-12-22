/**
 * Mock for nanoid package.
 * nanoid is ESM-only and doesn't work with Jest's CommonJS transform.
 * Production code uses the real nanoid via esbuild bundling.
 * Tests use IdGenerator injection, so this mock just needs to export a valid function.
 */

let counter = 0;

export const nanoid = (): string => {
  counter++;
  return `mock-nanoid-${counter.toString().padStart(4, '0')}`;
};
