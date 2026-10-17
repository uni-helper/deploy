import { describe, expect, it } from 'vitest'

import {
  CONFIG_DEPLOY_KEY,
  CONFIG_FILE_EXTENSIONS,
  CONFIG_FILE_NAME,
  DEFAULT_PROJECT_PATHS,
  PLATFORM_LABELS,
  PLATFORMS,
} from '../src/constants'

describe('constants', () => {
  it('平台列表与平台名映射保持一致', () => {
    expect(Object.keys(PLATFORM_LABELS)).toEqual([...PLATFORMS])
    expect(Object.keys(DEFAULT_PROJECT_PATHS)).toEqual([...PLATFORMS])
  })

  it('每个平台都有非空的中文名', () => {
    for (const platform of PLATFORMS) {
      expect(PLATFORM_LABELS[platform]).toBeTruthy()
    }
  })

  it('每个平台都有一个 dist/ 下的默认产物目录', () => {
    for (const platform of PLATFORMS) {
      const paths = DEFAULT_PROJECT_PATHS[platform]

      expect(paths.length).toBeGreaterThan(1)
      // 按优先级排列，首位应当是 uni-app 默认的构建产物目录
      expect(paths[0]).toBe(`dist/build/${platform}`)
      for (const path of paths) {
        expect(path).toMatch(/^dist\//)
      }
    }
  })

  it('约定配置文件名为 unh.config，以复用 @uni-helper/unh 的配置文件', () => {
    expect(CONFIG_FILE_NAME).toBe('unh.config')
    expect(CONFIG_FILE_EXTENSIONS).toContain('ts')
    expect(CONFIG_FILE_EXTENSIONS).toContain('js')
    expect(CONFIG_DEPLOY_KEY).toBe('deploy')
  })
})
