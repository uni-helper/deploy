import type BaseCI from './BaseCI'
import type { DeployAction, Platform } from './constants'
import type { DeployHooks, DeployOptions, DeployResult, DeployUserConfig, ResolvedConfig } from './types'
import process from 'node:process'
import { loadConfig, resolvePlatforms } from './config'
import { CONFIG_DEPLOY_KEY, CONFIG_FILE_NAME, PLATFORM_LABELS, PLATFORMS } from './constants'
import { logger } from './logger'
import AlipayCI from './platforms/AlipayCI'
import DingtalkCI from './platforms/DingtalkCI'
import JdCI from './platforms/JdCI'
import SwanCI from './platforms/SwanCI'
import TTCI from './platforms/TTCI'
import WeappCI from './platforms/WeappCI'

/** 平台到实现类的映射 */
const CI_CLASS_MAP = {
  'mp-weixin': WeappCI,
  'mp-alipay': AlipayCI,
  'mp-toutiao': TTCI,
  'mp-baidu': SwanCI,
  'mp-jd': JdCI,
  'mp-dingtalk': DingtalkCI,
} satisfies Record<Platform, unknown>

/**
 * 把平台名规范化为标准平台名，忽略大小写与首尾空白。
 *
 * @example
 * ```ts
 * normalizePlatform('mp-weixin') // 'mp-weixin'
 * normalizePlatform('MP-WEIXIN') // 'mp-weixin'
 * ```
 */
export function normalizePlatform(platform: string): Platform | undefined {
  const normalized = platform.trim().toLowerCase()

  if ((PLATFORMS as readonly string[]).includes(normalized)) {
    return normalized as Platform
  }

  return undefined
}

/**
 * 规范化平台列表，非法平台名会被抛出。
 */
export function normalizePlatforms(platforms: Array<string | Platform>): Platform[] {
  return platforms.map((platform) => {
    const normalized = normalizePlatform(platform)

    if (!normalized) {
      throw new Error(
        `不支持的小程序平台 "${platform}"，支持的平台：${PLATFORMS.join('、')}`,
      )
    }

    return normalized
  })
}

/**
 * 创建指定平台的 CI 实例。
 *
 * @param platform 平台名称
 * @param config 已解析的配置
 */
export function createCI(platform: Platform | string, config: ResolvedConfig): BaseCI {
  const normalized = normalizePlatform(platform)

  if (!normalized) {
    throw new Error(
      `不支持的小程序平台 "${platform}"，支持的平台：${PLATFORMS.join('、')}`,
    )
  }

  const CIClass = CI_CLASS_MAP[normalized] as new (config: ResolvedConfig, platform: Platform) => BaseCI
  return new CIClass(config, normalized)
}

/** 触发对应动作的生命周期回调 */
async function triggerHook(
  result: DeployResult,
  options: DeployHooks,
): Promise<void> {
  const hook = result.action === 'preview'
    ? options.onPreviewComplete
    : options.onUploadComplete

  if (typeof hook === 'function') {
    await hook(result)
  }
}

/**
 * 在指定平台上执行一次部署动作。
 *
 * 失败时不会抛出异常，而是返回 `success: false` 的结果，
 * 便于 CI 场景下一次性收集所有平台的结果。
 *
 * @example
 * ```ts
 * import { deploy } from '@uni-helper/deploy'
 *
 * const results = await deploy({ action: 'upload', platform: 'mp-weixin' })
 * ```
 */
export async function deploy(options: DeployOptions = {}): Promise<DeployResult[]> {
  const cwd = options.cwd ?? process.cwd()

  const inlineConfig: DeployUserConfig = {
    ...options.config,
    ...(options.cwd ? { cwd: options.cwd } : {}),
  }

  const config = await loadConfig(inlineConfig, cwd, { configFile: options.configFile })
  const action = options.action ?? 'upload'

  const platforms = options.platform
    ? normalizePlatforms(Array.isArray(options.platform) ? options.platform : [options.platform])
    : resolvePlatforms(config)

  if (!platforms.length) {
    throw new Error(
      `没有可用的平台，请先在 ${CONFIG_FILE_NAME}.ts 的 "${CONFIG_DEPLOY_KEY}" 字段中配置至少一个平台，`
      + `或通过 platform 参数指定。支持的平台：${PLATFORMS.join('、')}`,
    )
  }

  const results: DeployResult[] = []

  for (const platform of platforms) {
    logger.start(`开始${actionLabel(action)} ${PLATFORM_LABELS[platform]}`)

    let ci: BaseCI
    try {
      ci = createCI(platform, config)
      await ci.init()
    }
    catch (error) {
      const result = failure(platform, action, config, error)
      // 初始化阶段尚未进入平台实现，错误需要在这里打印
      logger.error(`【${PLATFORM_LABELS[platform]}】${result.error?.message}`)
      results.push(result)
      await triggerHook(result, options)
      continue
    }

    if (action === 'open') {
      try {
        await ci.open()
        logger.success(`【${PLATFORM_LABELS[platform]}】打开开发者工具完成`)
        results.push(success(platform, action, ci))
      }
      catch (error) {
        const result = failure(platform, action, config, error)
        logger.error(`【${PLATFORM_LABELS[platform]}】打开开发者工具失败：${result.error?.message}`)
        results.push(result)
      }
      continue
    }

    let result: DeployResult
    try {
      result = action === 'preview' ? await ci.preview() : await ci.upload()
    }
    catch (error) {
      result = failure(platform, action, config, error)
    }

    if (result.success) {
      logger.success(`【${PLATFORM_LABELS[platform]}】${actionLabel(action)}完成`)
    }
    else {
      logger.error(`【${PLATFORM_LABELS[platform]}】${actionLabel(action)}失败：${result.error?.message}`)
    }

    results.push(result)
    await triggerHook(result, options)
  }

  return results
}

/**
 * 上传代码作为体验版。
 *
 * @example
 * ```ts
 * import { upload } from '@uni-helper/deploy'
 *
 * await upload({ platform: 'mp-weixin' })
 * ```
 */
export function upload(options: Omit<DeployOptions, 'action'> = {}): Promise<DeployResult[]> {
  return deploy({ ...options, action: 'upload' })
}

/**
 * 上传代码作为开发版并生成预览二维码。
 *
 * @example
 * ```ts
 * import { preview } from '@uni-helper/deploy'
 *
 * await preview({ platform: 'mp-weixin' })
 * ```
 */
export function preview(options: Omit<DeployOptions, 'action'> = {}): Promise<DeployResult[]> {
  return deploy({ ...options, action: 'preview' })
}

/**
 * 打开小程序开发者工具。
 *
 * @example
 * ```ts
 * import { open } from '@uni-helper/deploy'
 *
 * await open({ platform: 'mp-weixin' })
 * ```
 */
export function open(options: Omit<DeployOptions, 'action'> = {}): Promise<DeployResult[]> {
  return deploy({ ...options, action: 'open' })
}

function actionLabel(action: DeployAction): string {
  return {
    open: '打开开发者工具',
    preview: '预览',
    upload: '上传',
  }[action]
}

/** 构造一个表示失败的结果 */
function failure(
  platform: Platform,
  action: DeployAction,
  config: ResolvedConfig,
  error: unknown,
): DeployResult {
  const caught = error instanceof Error ? error : new Error(String(error))

  return {
    platform,
    action,
    success: false,
    version: config.version ?? '',
    desc: config.desc ?? '',
    projectPath: '',
    qrCodeContent: '',
    qrCodeLocalPath: '',
    error: caught,
  }
}

/** 构造一个表示成功的结果，用于没有二维码产出的动作 */
function success(platform: Platform, action: DeployAction, ci: BaseCI): DeployResult {
  return {
    platform,
    action,
    success: true,
    version: ci.version,
    desc: ci.desc,
    projectPath: ci.projectPath,
    qrCodeContent: '',
    qrCodeLocalPath: '',
  }
}
