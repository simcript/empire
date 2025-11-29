import { defineConfig } from 'vite'
import { builtinModules } from 'module'

const externalDeps = ['electron']

const external = [
  ...new Set([...externalDeps, ...builtinModules, ...builtinModules.map((m) => `node:${m}`)]),
]

export default defineConfig({
  publicDir: false,
  build: {
    outDir: '.vite/build',
    emptyOutDir: false,
    target: 'node18',
    lib: {
      entry: 'main.js',
      formats: ['cjs'],
      fileName: () => 'main.cjs',
    },
    rollupOptions: {
      external,
      output: {
        format: 'cjs',
        exports: 'auto',
        entryFileNames: 'main.cjs',
      },
    },
  },
})
