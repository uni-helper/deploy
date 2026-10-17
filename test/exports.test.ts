import { expect, it } from 'vitest'
import { getPackageExportsManifest } from 'vitest-package-exports'

/**
 * 锁定包的公开导出。
 *
 * 刻意使用 `importMode: 'src'` 而非默认的 `'dist'`，这样 `pnpm test` 无须先执行
 * `pnpm build` 即可运行；产物本身的正确性由 `tsdown` 内置的 `publint` 检查负责。
 * 新增或删除导出时该快照会失败，需要显式更新，避免无意间破坏公开 API。
 */
it('入口导出的 API 与预期一致', async () => {
  const manifest = await getPackageExportsManifest({
    cwd: process.cwd(),
    importMode: 'src',
  })

  expect(manifest.exports['.']).toMatchInlineSnapshot(`
    {
      "AlipayCI": "function",
      "BaseCI": "function",
      "CONFIG_DEPLOY_KEY": "string",
      "CONFIG_FILE_EXTENSIONS": "object",
      "CONFIG_FILE_NAME": "string",
      "DEFAULT_PROJECT_PATHS": "object",
      "DingtalkCI": "function",
      "JdCI": "function",
      "PLATFORMS": "object",
      "PLATFORM_LABELS": "object",
      "SwanCI": "function",
      "TTCI": "function",
      "WeappCI": "function",
      "compareVersion": "function",
      "consola": "object",
      "createCI": "function",
      "defaultConfig": "object",
      "defineConfig": "function",
      "deploy": "function",
      "generateQrcodeImageFile": "function",
      "loadConfig": "function",
      "logger": "object",
      "normalizePlatform": "function",
      "normalizePlatforms": "function",
      "open": "function",
      "preview": "function",
      "printQrcode2Terminal": "function",
      "readQrcodeImageContent": "function",
      "resolvePlatforms": "function",
      "resolveProjectPath": "function",
      "toError": "function",
      "upload": "function",
    }
  `)
})
