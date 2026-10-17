import { defineConfig } from 'tsdown'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  platform: 'node',
  // 与 package.json 的 engines 下限保持一致，避免产出 Node 20 无法解析的语法。
  target: 'node20',
  dts: {
    entry: ['src/index.ts'],
  },
  publint: true,
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
})
