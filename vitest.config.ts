import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // test/exports.test.ts 依赖 vitest-package-exports 在测试进程内解析入口，
    // 需要显式 inline，否则会被当作外部依赖走 node 解析
    server: {
      deps: {
        inline: ['vitest-package-exports'],
      },
    },
  },
})
