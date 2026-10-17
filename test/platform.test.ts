import { describe, expect, it } from 'vitest'

import { PLATFORM_LABELS, PLATFORMS } from '../src/constants'
import { createCI, normalizePlatform, normalizePlatforms } from '../src/deploy'

describe('normalizePlatform', () => {
  it.each([...PLATFORMS])('标准平台名 %s 原样返回', (platform) => {
    expect(normalizePlatform(platform)).toBe(platform)
  })

  it('忽略大小写与首尾空白', () => {
    expect(normalizePlatform('MP-WEIXIN')).toBe('mp-weixin')
    expect(normalizePlatform('  mp-weixin  ')).toBe('mp-weixin')
  })

  it('无法识别的平台返回 undefined 而不是抛出', () => {
    expect(normalizePlatform('mp-h5')).toBeUndefined()
    expect(normalizePlatform('')).toBeUndefined()
    expect(normalizePlatform('app')).toBeUndefined()
  })

  it('不再接受平台别名', () => {
    expect(normalizePlatform('weapp')).toBeUndefined()
    expect(normalizePlatform('alipay')).toBeUndefined()
    expect(normalizePlatform('tt')).toBeUndefined()
  })
})

describe('normalizePlatforms', () => {
  it('批量归一化并保留顺序', () => {
    expect(normalizePlatforms(['mp-weixin', 'mp-alipay', 'mp-toutiao'])).toEqual([
      'mp-weixin',
      'mp-alipay',
      'mp-toutiao',
    ])
  })

  it('空列表返回空列表', () => {
    expect(normalizePlatforms([])).toEqual([])
  })

  it('包含非法平台时抛出并提示支持的平台', () => {
    expect(() => normalizePlatforms(['mp-h5'])).toThrow(/不支持的小程序平台/)
    expect(() => normalizePlatforms(['mp-h5'])).toThrow(/mp-weixin/)
    expect(() => normalizePlatforms(['weapp'])).toThrow(/不支持的小程序平台/)
  })
})

describe('platform labels', () => {
  it('每个平台都能取到用于日志的中文名', () => {
    for (const platform of PLATFORMS) {
      expect(PLATFORM_LABELS[platform]).toMatch(/[\u4E00-\u9FA5]/)
    }
  })
})

describe('createCI', () => {
  /** 构造一份能让 BaseCI 通过校验的最小配置 */
  function configFor(...platforms: string[]) {
    return {
      cwd: process.cwd(),
      projectPath: 'dist',
      ...Object.fromEntries(platforms.map(platform => [platform, { appid: 'x' }])),
    } as any
  }

  it('非法平台名抛出异常', () => {
    expect(() => createCI('mp-h5', configFor('mp-h5'))).toThrow(/不支持的小程序平台/)
    expect(() => createCI('weapp', configFor('mp-weixin'))).toThrow(/不支持的小程序平台/)
  })

  it('各平台均可实例化，且不依赖平台官方 CI 包', () => {
    for (const platform of PLATFORMS) {
      const ci = createCI(platform, configFor(platform))
      expect(ci.platform).toBe(platform)
    }
  })

  it('缺少平台配置时给出指向 unh.config.ts 的提示', () => {
    expect(() => createCI('mp-weixin', configFor())).toThrow(/unh\.config\.ts 的 "deploy" 字段/)
  })

  it('找不到构建产物目录时提示先执行构建', () => {
    const config = { 'cwd': process.cwd(), 'mp-weixin': { appid: 'x' } } as any
    expect(() => createCI('mp-weixin', config)).toThrow(/找不到 "mp-weixin" 的构建产物目录/)
  })
})
