import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import stripJsonComments from 'strip-json-comments'

/**
 * 读取 JSON 文件，允许包含注释。
 *
 * uni-app 生成的 `manifest.json` 常带有注释，因此这里统一去除后再解析。
 */
export function readJsonFile<T = any>(filePath: string): T | undefined {
  if (!existsSync(filePath)) {
    return undefined
  }

  try {
    return JSON.parse(stripJsonComments(readFileSync(filePath, 'utf-8'))) as T
  }
  catch {
    return undefined
  }
}

/**
 * 按顺序读取若干候选文件中的字段，返回第一个取到的非空值。
 */
export function findField<T = string>(candidates: Array<{ file: string, path: string[] }>, cwd: string): T | undefined {
  for (const { file, path } of candidates) {
    const json = readJsonFile(resolve(cwd, file))
    if (json == null) {
      continue
    }

    let value: any = json
    for (const key of path) {
      value = value?.[key]
    }

    if (value != null && value !== '') {
      return value as T
    }
  }

  return undefined
}

/**
 * 读取项目版本号。
 *
 * 优先取 `manifest.json` 的 `versionName`，其次取 `package.json` 的 `version`。
 */
export function getVersion(cwd: string): string | undefined {
  return findField<string>([
    { file: 'src/manifest.json', path: ['versionName'] },
    { file: 'manifest.json', path: ['versionName'] },
    { file: 'package.json', path: ['version'] },
  ], cwd)
}

/**
 * 在 `cwd` 下查找第一个存在的目录，返回其绝对路径。
 */
export function findDir(candidates: string[], cwd: string): string | undefined {
  const file = candidates.find(candidate => existsSync(resolve(cwd, candidate)))
  return file ? resolve(cwd, file) : undefined
}
