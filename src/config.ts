import type { Platform } from './constants'

import type { DeployConfigFile, DeployUserConfig, ResolvedConfig } from './types'
import { resolve } from 'node:path'
import process from 'node:process'
import { config as loadDotenv } from 'dotenv'

import { expand } from 'dotenv-expand'
import { loadConfig as loadUnconfig } from 'unconfig'

import {
  CONFIG_DEPLOY_KEY,
  CONFIG_FILE_EXTENSIONS,
  CONFIG_FILE_NAME,
  DEFAULT_PROJECT_PATHS,
  PLATFORMS,
} from './constants'
import { findDir, getVersion } from './utils/file'

/**
 * 默认配置。
 */
export const defaultConfig: ResolvedConfig = {
  cwd: process.cwd(),
}

/**
 * 类型友好的配置辅助函数。
 *
 * 所有配置都写在 `deploy` 字段下，`unh.config.ts` 的其余部分
 * 可以留给 `@uni-helper/unh` 等其它工具使用。
 *
 * @example
 * ```ts
 * // unh.config.ts
 * import { defineConfig } from '@uni-helper/deploy'
 *
 * export default defineConfig({
 *   deploy: {
 *     'mp-weixin': { appid: 'wx1234567890' },
 *   },
 * })
 * ```
 */
export function defineConfig(config: DeployConfigFile): DeployConfigFile {
  return config
}

/**
 * 从环境变量读取配置。
 *
 * 私钥等敏感信息建议通过 `.env` 提供，避免提交到版本库。
 *
 * 仅供内部使用；外部调用方请使用 `loadConfig`。
 */
function loadEnvConfig(): DeployUserConfig {
  // quiet 避免 dotenv 在每次加载时打印提示
  expand(loadDotenv({ quiet: true }))

  return {
    'mp-weixin': {
      appid: process.env.MP_WEIXIN_APPID,
      privateKey: process.env.MP_WEIXIN_PRIVATE_KEY,
      privateKeyPath: process.env.MP_WEIXIN_PRIVATE_KEY_PATH,
    },
    'mp-alipay': {
      appid: process.env.MP_ALIPAY_APPID,
      privateKey: process.env.MP_ALIPAY_PRIVATE_KEY,
      privateKeyPath: process.env.MP_ALIPAY_PRIVATE_KEY_PATH,
      toolId: process.env.MP_ALIPAY_TOOL_ID,
    },
    'mp-toutiao': {
      email: process.env.MP_TOUTIAO_EMAIL,
      password: process.env.MP_TOUTIAO_PASSWORD,
    },
    'mp-baidu': {
      token: process.env.MP_BAIDU_TOKEN,
    },
    'mp-jd': {
      privateKey: process.env.MP_JD_PRIVATE_KEY,
    },
    'mp-dingtalk': {
      appid: process.env.MP_DINGTALK_APPID,
      token: process.env.MP_DINGTALK_TOKEN,
    },
  } as DeployUserConfig
}

/**
 * 剔除 `undefined` 与空对象。
 *
 * 环境变量未设置时会产生大量 `undefined`，若保留会覆盖掉默认值；
 * 同理，未配置的平台会留下空对象，导致平台自动识别出现误判。
 */
function pruneUndefined<T extends Record<string, any>>(value: T): T {
  const result: Record<string, any> = {}

  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) {
      continue
    }

    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      const pruned = pruneUndefined(item)

      // 丢弃空对象，避免被误判为"已配置"
      if (Object.keys(pruned).length === 0) {
        continue
      }

      result[key] = pruned
      continue
    }

    result[key] = item
  }

  return result as T
}

/** `loadConfig` 的选项 */
export interface LoadConfigOptions {
  /**
   * 自定义配置文件路径。
   *
   * - `undefined`：使用默认的 `unh.config.ts` 等文件
   * - `false`：不读取任何配置文件
   * - `string`：读取指定文件
   */
  configFile?: string | false
}

/**
 * 读取并解析配置。
 *
 * 配置来源按优先级从低到高依次为：
 * 1. 内置默认值
 * 2. `.env` 中的环境变量
 * 3. `unh.config.ts` 中 `deploy` 字段下的配置
 * 4. 调用时传入的 `inlineConfig`
 *
 * @param inlineConfig 内联配置，优先级最高
 * @param cwd 工作目录，默认为 `process.cwd()`
 * @param options 额外选项
 */
export async function loadConfig(
  inlineConfig: DeployUserConfig = {},
  cwd: string = process.cwd(),
  options: LoadConfigOptions = {},
): Promise<ResolvedConfig> {
  const envConfig = loadEnvConfig()

  const fileConfig = options.configFile === false
    ? {}
    : await loadConfigFile(cwd, options.configFile)

  const merged = pruneUndefined({
    ...defaultConfig,
    ...envConfig,
    ...fileConfig,
    ...inlineConfig,
  } as Record<string, any>) as ResolvedConfig

  // 版本号与描述兜底：配置 > manifest.json / package.json > 默认描述
  merged.cwd = cwd
  merged.version = merged.version ?? getVersion(cwd)
  merged.desc = merged.desc ?? `CI 构建自动构建于 ${new Date().toLocaleString()}`

  return merged
}

/**
 * 读取配置文件。
 *
 * `unh.config.ts` 可能是与 `@uni-helper/unh` 共用的文件，本工具只取其中的
 * `deploy` 字段；文件不存在或未配置 `deploy` 字段时返回空对象。
 *
 * @param cwd 工作目录
 * @param configFile 自定义配置文件路径
 */
async function loadConfigFile(cwd: string, configFile?: string): Promise<DeployUserConfig> {
  const sources = configFile
    ? [{ files: configFile, extensions: [''] }]
    : [{ files: CONFIG_FILE_NAME, extensions: CONFIG_FILE_EXTENSIONS }]

  try {
    const { config } = await loadUnconfig<DeployConfigFile>({
      cwd,
      sources,
      merge: true,
    })

    const deploy = config?.[CONFIG_DEPLOY_KEY]

    return deploy != null && typeof deploy === 'object' && !Array.isArray(deploy)
      ? deploy as DeployUserConfig
      : {}
  }
  catch (error) {
    // 配置文件里抛错时应当中断，而不是静默降级
    throw new Error(
      `读取配置文件失败：${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    )
  }
}

/**
 * 得出实际需要操作的平台列表。
 *
 * 优先使用显式配置的 `platforms`，否则取所有已配置的平台。
 */
export function resolvePlatforms(config: ResolvedConfig): Platform[] {
  if (config.platforms?.length) {
    return config.platforms
  }

  return PLATFORMS.filter(platform => config[platform] != null)
}

/**
 * 解析某个平台的项目产物目录。
 *
 * 优先使用平台级 `projectPath`，其次使用全局 `projectPath`，
 * 最后按 uni-app 的约定查找 `dist/build/<platform>` 等目录。
 */
export function resolveProjectPath(
  platform: Platform,
  config: ResolvedConfig,
): string | undefined {
  const configured = config[platform]?.projectPath ?? config.projectPath

  if (configured) {
    return resolve(config.cwd, configured)
  }

  return findDir(DEFAULT_PROJECT_PATHS[platform], config.cwd)
}
