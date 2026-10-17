import { createRequire } from 'node:module'
import process from 'node:process'

const require = createRequire(import.meta.url)

const cache = new Map<string, string>()

/**
 * 解析依赖的入口文件路径。
 *
 * 各平台的官方 CI 包体积较大且并非必装，因此不放在 `dependencies` 中，
 * 而是运行时从使用方的项目中解析，解析失败时给出明确的安装提示。
 */
export function resolvePackage(packageName: string, cwd: string): string {
  const key = `${packageName}\0${cwd}`

  const cached = cache.get(key)
  if (cached) {
    return cached
  }

  try {
    const resolved = require.resolve(packageName, { paths: [cwd, process.cwd()] })
    cache.set(key, resolved)
    return resolved
  }
  catch {
    throw new Error(
      `找不到依赖 "${packageName}"，请先安装：\n  npm install -D ${packageName}`,
      { cause: undefined },
    )
  }
}

/**
 * 解析并加载依赖。
 */
export function loadPackage<T = any>(packageName: string, cwd: string): T {
  const resolved = resolvePackage(packageName, cwd)
  return require(resolved) as T
}
