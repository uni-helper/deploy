#!/usr/bin/env node
import type { DeployAction, Platform } from './constants'

import type { DeployResult, DeployUserConfig } from './types'

import process from 'node:process'
import { cac } from 'cac'
import { loadConfig } from './config'
import { PLATFORM_LABELS, PLATFORMS } from './constants'
import { deploy, normalizePlatforms } from './deploy'

import { logger } from './logger'
import { version as packageVersion } from './version'

const cli = cac('uni-deploy')

const ACTION_LABELS: Record<DeployAction, string> = {
  upload: '上传',
  preview: '预览',
  open: '打开开发者工具',
}

/** 通用命令的描述 */
const COMMAND_DESCRIPTIONS: Record<DeployAction, string> = {
  upload: '上传代码作为体验版',
  preview: '上传代码作为开发版并生成预览二维码',
  open: '打开小程序开发者工具',
}

interface CommonCliOptions {
  platform?: string | string[]
  cwd?: string
  config?: string | false
  appVersion?: string
  desc?: string
  projectPath?: string
}

/** 解析 --config / --no-config 传入的配置来源 */
function resolveConfigOption(options: CommonCliOptions): string | false | undefined {
  if (options.config === false) {
    return false
  }

  if (typeof options.config === 'string') {
    const value = options.config.trim()
    return value === '' || value === 'false' ? false : value
  }

  return undefined
}

/** 从命令行参数组装内联配置，仅包含显式传入的字段 */
function buildInlineConfig(options: CommonCliOptions): DeployUserConfig {
  const inline: DeployUserConfig = {}

  if (options.appVersion) {
    inline.version = options.appVersion
  }
  if (options.desc) {
    inline.desc = options.desc
  }
  if (options.projectPath) {
    inline.projectPath = options.projectPath
  }

  return inline
}

/** 解析 --platform 参数，支持逗号分隔与多次传入 */
function parsePlatformOption(platform: string | string[] | undefined): Platform[] | undefined {
  if (platform === undefined) {
    return undefined
  }

  const list = (Array.isArray(platform) ? platform : [platform])
    .flatMap(item => String(item).split(','))
    .map(item => item.trim())
    .filter(Boolean)

  return list.length ? normalizePlatforms(list) : undefined
}

/**
 * 输出部署结果汇总。
 *
 * 各平台在执行过程中已经打印了详细信息（二维码路径、失败原因等），
 * 这里只给出结论并决定退出码，避免重复刷屏。
 *
 * @returns 全部成功时返回 true
 */
function reportResults(results: DeployResult[]): boolean {
  const succeeded = results.filter(result => result.success)
  const failed = results.filter(result => !result.success)

  if (!failed.length) {
    const labels = succeeded.map(result => PLATFORM_LABELS[result.platform]).join('、')
    logger.success(`全部完成：${labels}`)

    for (const result of succeeded) {
      if (result.qrCodeLocalPath) {
        logger.info(`【${PLATFORM_LABELS[result.platform]}】二维码图片：${result.qrCodeLocalPath}`)
      }
    }

    return true
  }

  const failedLabels = failed.map(result => PLATFORM_LABELS[result.platform]).join('、')
  logger.error(`失败 ${failed.length} 个（${failedLabels}），成功 ${succeeded.length} 个`)

  return false
}

/** 命令的公共参数 */
const COMMON_OPTIONS = {
  '--cwd <dir>': '工作目录，默认为当前目录',
  '--config <path>': '自定义配置文件路径，传 false 表示不读取配置文件',
  /**
   * 不能叫 `--version`。
   *
   * `cli.version()` 注册的全局 `-v, --version` 是布尔选项，与同名取值选项冲突：
   * cac 会把它从子命令的 help 里过滤掉，并且传入时误判为「缺少取值」直接报错。
   * 小程序版本号因此改用 `--app-version`。
   */
  '--app-version <version>': '版本号，覆盖配置文件中的 version',
  '--desc <desc>': '版本描述，覆盖配置文件中的 desc',
  '--projectPath <path>': '构建产物目录，覆盖配置文件中的 projectPath',
} as const

/** 执行一次部署并统一处理日志与退出码 */
async function run(action: DeployAction, options: CommonCliOptions, platform?: Platform): Promise<void> {
  const cwd = options.cwd ?? process.cwd()

  try {
    // 平台留空时由 deploy 依据配置文件自动推断，避免重复读取配置
    const results = await deploy({
      action,
      platform: platform ?? parsePlatformOption(options.platform),
      config: buildInlineConfig(options),
      configFile: resolveConfigOption(options),
      cwd,
    })

    if (!reportResults(results)) {
      process.exitCode = 1
    }
  }
  catch (error) {
    logger.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

/* 通用命令：uni-deploy upload / preview / open */
for (const action of ['upload', 'preview', 'open'] as const) {
  cli
    .command(action, COMMAND_DESCRIPTIONS[action])
    .option('-p, --platform <platform>', `目标平台，多个平台用逗号分隔。可选：${PLATFORMS.join('/')}`)
    .option('--cwd <dir>', COMMON_OPTIONS['--cwd <dir>'])
    .option('--config <path>', COMMON_OPTIONS['--config <path>'])
    .option('--app-version <version>', COMMON_OPTIONS['--app-version <version>'])
    .option('--desc <desc>', COMMON_OPTIONS['--desc <desc>'])
    .option('--projectPath <path>', COMMON_OPTIONS['--projectPath <path>'])
    .action((options: CommonCliOptions) => run(action, options))
}

/* 平台命令：uni-deploy upload:mp-weixin */
for (const platform of PLATFORMS) {
  for (const action of ['upload', 'preview', 'open'] as const) {
    const description = action === 'open'
      ? `打开${PLATFORM_LABELS[platform]}开发者工具`
      : `${ACTION_LABELS[action]}${PLATFORM_LABELS[platform]}`

    cli
      .command(`${action}:${platform}`, description)
      .option('--cwd <dir>', COMMON_OPTIONS['--cwd <dir>'])
      .option('--config <path>', COMMON_OPTIONS['--config <path>'])
      .option('--app-version <version>', COMMON_OPTIONS['--app-version <version>'])
      .option('--desc <desc>', COMMON_OPTIONS['--desc <desc>'])
      .option('--projectPath <path>', COMMON_OPTIONS['--projectPath <path>'])
      .action((options: CommonCliOptions) => run(action, options, platform))
  }
}

/* 查看解析后的配置：uni-deploy config */
cli
  .command('config', '查看解析后的配置')
  .option('--cwd <dir>', COMMON_OPTIONS['--cwd <dir>'])
  .option('--config <path>', COMMON_OPTIONS['--config <path>'])
  .action(async (options: CommonCliOptions) => {
    const cwd = options.cwd ?? process.cwd()

    try {
      const config = await loadConfig({}, cwd, { configFile: resolveConfigOption(options) })
      logger.log(JSON.stringify(config, null, 2))
    }
    catch (error) {
      logger.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    }
  })

/* 查看支持的平台：uni-deploy platforms */
cli
  .command('platforms', '查看支持的平台')
  .action(() => {
    logger.log(`支持的平台：${PLATFORMS.join('、')}`)
  })

cli.help()
cli.version(packageVersion)

cli.parse(process.argv, { run: false })

try {
  await cli.runMatchedCommand()
}
catch (error) {
  logger.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
