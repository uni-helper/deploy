import { describe, expect, it } from 'vitest'

import { compareVersion } from '../src/utils/compareVersion'

describe('compareVersion', () => {
  it.each([
    ['1.0.0', '0.9.9', 1],
    ['0.9.9', '1.0.0', -1],
    ['1.2.3', '1.2.3', 0],
  ])('%s 与 %s 比较应返回 %i', (v1, v2, expected) => {
    expect(compareVersion(v1, v2)).toBe(expected)
  })

  it('缺省段位按 0 处理', () => {
    expect(compareVersion('1', '1.0.0')).toBe(0)
    expect(compareVersion('1.2', '1.2.0')).toBe(0)
    expect(compareVersion('1.2.1', '1.2')).toBe(1)
    expect(compareVersion('1.2', '1.2.1')).toBe(-1)
  })

  it('逐段比较而非字典序比较', () => {
    // 字典序下 "10" < "9"，逐段数值比较才是正确的
    expect(compareVersion('1.10.0', '1.9.0')).toBe(1)
    expect(compareVersion('2.0.0', '10.0.0')).toBe(-1)
  })

  it('预发布等非数字段解析为 NaN 时不应抛出', () => {
    expect(() => compareVersion('1.0.0-beta.1', '1.0.0')).not.toThrow()
    expect(() => compareVersion('1.0.0-beta.1', '2.0.0')).not.toThrow()
  })
})
