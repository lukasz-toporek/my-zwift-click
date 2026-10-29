import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    // Allow vitest to resolve .js imports to .ts files (TypeScript convention)
    extensions: ['.ts', '.js'],
  },
});
