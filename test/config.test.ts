import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loadConfigMock = vi.hoisted(() => vi.fn())

vi.mock('unconfig', () => ({
  loadConfig: loadConfigMock,
}))

const { loadConfig, resolvePlatforms, resolveProjectPath } = await import('../src/config')

let cwd: string

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), 'uni-deploy-'))
  loadConfigMock.mockReset()
  loadConfigMock.mockResolvedValue({ config: undefined, sources: [] })
})

afterEach(async () => {
  await rm(cwd, { force: true, recursive: true })
})

describe('loadConfig', () => {
  it('没有任何配置时给出 cwd 与兜底描述', async () => {
    const config = await loadConfig({}, cwd)

    expect(config.cwd).toBe(cwd)
    expect(config.desc).toBeTruthy()
    expect(config.version).toBeUndefined()
  })

  it('只读取配置文件的 deploy 字段，其余字段留给其它工具', async () => {
    loadConfigMock.mockResolvedValue({
      config: {
        // @uni-helper/unh 的字段，本工具必须忽略
        platform: { default: 'h5' },
        deploy: { 'mp-weixin': { appid: 'wx0000000000000000' } },
      },
      sources: [],
    })

    const config = await loadConfig({}, cwd)

    expect(config['mp-weixin']).toEqual({ appid: 'wx0000000000000000' })
    expect(config).not.toHaveProperty('platform')
  })

  it('配置文件中没有 deploy 字段时按无配置处理', async () => {
    loadConfigMock.mockResolvedValue({
      config: { platform: { default: 'h5' } },
      sources: [],
    })

    const config = await loadConfig({}, cwd)

    expect(resolvePlatforms(config)).toEqual([])
  })

  it('deploy 字段不是对象时按无配置处理', async () => {
    loadConfigMock.mockResolvedValue({ config: { deploy: ['mp-weixin'] }, sources: [] })

    const config = await loadConfig({}, cwd)

    expect(resolvePlatforms(config)).toEqual([])
  })

  it('内联配置优先级高于配置文件', async () => {
    loadConfigMock.mockResolvedValue({
      config: { deploy: { desc: '来自配置文件', version: '1.0.0' } },
      sources: [],
    })

    const config = await loadConfig({ desc: '来自内联配置' }, cwd)

    expect(config.desc).toBe('来自内联配置')
    // 未覆盖的字段仍然取配置文件的值
    expect(config.version).toBe('1.0.0')
  })

  it('configFile 为 false 时不读取配置文件', async () => {
    const config = await loadConfig({ desc: '内联' }, cwd, { configFile: false })

    expect(loadConfigMock).not.toHaveBeenCalled()
    expect(config.desc).toBe('内联')
  })

  it('显式指定 configFile 时只读取该文件', async () => {
    await loadConfig({}, cwd, { configFile: 'custom.config.ts' })

    expect(loadConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sources: [{ files: 'custom.config.ts', extensions: [''] }],
      }),
    )
  })

  it('未指定 configFile 时读取 unh.config.* 的全部扩展名', async () => {
    await loadConfig({}, cwd)

    expect(loadConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd,
        sources: [
          {
            files: 'unh.config',
            extensions: ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs'],
          },
        ],
      }),
    )
  })

  it('读取配置文件失败时抛出并带上原因', async () => {
    loadConfigMock.mockRejectedValue(new Error('SyntaxError'))

    await expect(loadConfig({}, cwd)).rejects.toThrow(/读取配置文件失败/)
  })

  it('版本号优先取 manifest.json 的 versionName', async () => {
    await mkdir(join(cwd, 'src'))
    await writeFile(
      join(cwd, 'src/manifest.json'),
      '{\n  // manifest.json 允许注释\n  "versionName": "2.3.4"\n}',
      'utf-8',
    )
    await writeFile(join(cwd, 'package.json'), JSON.stringify({ version: '0.1.0' }), 'utf-8')

    const config = await loadConfig({}, cwd)

    expect(config.version).toBe('2.3.4')
  })

  it('没有 manifest.json 时回退到 package.json 的 version', async () => {
    await writeFile(join(cwd, 'package.json'), JSON.stringify({ version: '0.1.0' }), 'utf-8')

    const config = await loadConfig({}, cwd)

    expect(config.version).toBe('0.1.0')
  })

  it('未配置 desc 时生成带时间戳的默认描述', async () => {
    const config = await loadConfig({}, cwd)

    expect(config.desc).toMatch(/CI 构建自动构建于/)
    expect(config.desc).not.toBe('CI 构建自动构建于 Invalid Date')
  })

  it('环境变量未设置时不会覆盖平台配置', async () => {
    loadConfigMock.mockResolvedValue({
      config: { deploy: { 'mp-weixin': { appid: 'wx0000000000000000' } } },
      sources: [],
    })

    const config = await loadConfig({}, cwd)

    // 未配置的平台不应留下空对象，否则会被误判为"已配置"
    expect(resolvePlatforms(config)).toEqual(['mp-weixin'])
  })
})

describe('resolvePlatforms', () => {
  it('显式配置 platforms 时以其为准', () => {
    expect(
      resolvePlatforms({ cwd, 'platforms': ['mp-baidu', 'mp-jd'], 'mp-weixin': { appid: 'wx' } } as any),
    ).toEqual(['mp-baidu', 'mp-jd'])
  })

  it('未配置 platforms 时取所有已配置的平台，并保持既定顺序', () => {
    expect(
      resolvePlatforms({
        cwd,
        'mp-dingtalk': { appid: 'x' },
        'mp-weixin': { appid: 'wx' },
        'mp-alipay': { appid: 'y' },
      } as any),
    ).toEqual(['mp-weixin', 'mp-alipay', 'mp-dingtalk'])
  })

  it('没有任何平台配置时返回空列表', () => {
    expect(resolvePlatforms({ cwd } as any)).toEqual([])
  })

  it('platforms 为空数组时回退到自动识别', () => {
    expect(
      resolvePlatforms({ cwd, 'platforms': [], 'mp-jd': { privateKey: 'k' } } as any),
    ).toEqual(['mp-jd'])
  })
})

describe('resolveProjectPath', () => {
  it('平台级 projectPath 优先于全局 projectPath', () => {
    const config = {
      cwd,
      'projectPath': 'dist/global',
      'mp-weixin': { appid: 'wx', projectPath: 'dist/weapp' },
    } as any

    expect(resolveProjectPath('mp-weixin', config)).toBe(join(cwd, 'dist/weapp'))
  })

  it('未配置平台级 projectPath 时使用全局 projectPath', () => {
    const config = { cwd, 'projectPath': 'dist/global', 'mp-weixin': { appid: 'wx' } } as any

    expect(resolveProjectPath('mp-weixin', config)).toBe(join(cwd, 'dist/global'))
  })

  it('都未配置时按 uni-app 约定查找 dist/build/<platform>', async () => {
    await mkdir(join(cwd, 'dist/build/mp-weixin'), { recursive: true })

    const config = { cwd, 'mp-weixin': { appid: 'wx' } } as any

    expect(resolveProjectPath('mp-weixin', config)).toBe(join(cwd, 'dist/build/mp-weixin'))
  })

  it('优先使用 dist/build 而不是 dist/dev', async () => {
    await mkdir(join(cwd, 'dist/build/mp-weixin'), { recursive: true })
    await mkdir(join(cwd, 'dist/dev/mp-weixin'), { recursive: true })

    const config = { cwd, 'mp-weixin': { appid: 'wx' } } as any

    expect(resolveProjectPath('mp-weixin', config)).toBe(join(cwd, 'dist/build/mp-weixin'))
  })

  it('只有 dist/dev 时回退到 dev 目录', async () => {
    await mkdir(join(cwd, 'dist/dev/mp-alipay'), { recursive: true })

    const config = { cwd, 'mp-alipay': { appid: 'y' } } as any

    expect(resolveProjectPath('mp-alipay', config)).toBe(join(cwd, 'dist/dev/mp-alipay'))
  })

  it('任何候选目录都不存在时返回 undefined', () => {
    const config = { cwd, 'mp-toutiao': { email: 'a@b.c' } } as any

    expect(resolveProjectPath('mp-toutiao', config)).toBeUndefined()
  })
})

describe('进程工作目录', () => {
  it('未显式传入 cwd 时使用 process.cwd()', async () => {
    const config = await loadConfig({})

    expect(config.cwd).toBe(process.cwd())
  })
})
