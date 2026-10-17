import type { Platform } from './constants'
import type { DeployResult, PlatformConfig, QrCodeResult, ResolvedConfig } from './types'

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveProjectPath } from './config'
import { CONFIG_DEPLOY_KEY, CONFIG_FILE_NAME, PLATFORM_LABELS } from './constants'

import { logger } from './logger'
import { runCommand } from './utils/exec'

/**
 * 各平台 CI 的抽象基类。
 *
 * 子类实现 `init`、`open`、`preview`、`upload` 四个方法即可接入新的平台。
 */
export default abstract class BaseCI {
  /** 当前平台 */
  readonly platform: Platform

  /** 当前平台对应的配置 */
  protected platformConfig: PlatformConfig

  /** 当前要发布的版本号 */
  readonly version: string

  /** 当前发布内容的描述 */
  readonly desc: string

  /** 命令要操作的项目目录 */
  readonly projectPath: string

  /** 工作目录 */
  protected cwd: string

  constructor(config: ResolvedConfig, platform: Platform) {
    this.platform = platform
    this.cwd = config.cwd

    const platformConfig = config[platform]
    if (platformConfig == null) {
      throw new Error(`缺少 "${platform}" 平台配置，请在 ${this.configFileHint()} 中补充`)
    }
    this.platformConfig = platformConfig

    const projectPath = resolveProjectPath(platform, config)
    if (!projectPath) {
      throw new Error(
        `找不到 "${platform}" 的构建产物目录，请先执行构建，或显式配置 projectPath`,
      )
    }

    this.projectPath = projectPath
    this.version = platformConfig.version ?? config.version ?? '1.0.0'
    this.desc = platformConfig.desc ?? config.desc ?? `CI 构建自动构建于 ${new Date().toLocaleString()}`
  }

  /** 提示配置文件位置 */
  private configFileHint(): string {
    return `${CONFIG_FILE_NAME}.ts 的 "${CONFIG_DEPLOY_KEY}" 字段`
  }

  /** 平台中文名 */
  protected get label(): string {
    return PLATFORM_LABELS[this.platform]
  }

  /** 校验项目目录存在 */
  protected assertProjectPath(): void {
    if (!existsSync(this.projectPath)) {
      throw new Error(`"projectPath" 配置的路径不存在：${this.projectPath}`)
    }
  }

  /** 把相对 `cwd` 的路径解析为绝对路径 */
  protected resolveFromCwd(path: string): string {
    return resolve(this.cwd, path)
  }

  /** 记录一次成功的预览结果 */
  protected previewResult(qrCode: Partial<QrCodeResult>): DeployResult {
    return this.buildResult('preview', true, qrCode)
  }

  /** 记录一次成功的上传结果 */
  protected uploadResult(qrCode: Partial<QrCodeResult>): DeployResult {
    return this.buildResult('upload', true, qrCode)
  }

  /** 记录一次失败的结果 */
  protected failureResult(error: unknown, action: 'preview' | 'upload'): DeployResult {
    return this.buildResult(action, false, {}, error)
  }

  private buildResult(
    action: 'preview' | 'upload',
    success: boolean,
    qrCode: Partial<QrCodeResult>,
    error?: unknown,
  ): DeployResult {
    return {
      platform: this.platform,
      action,
      success,
      version: this.version,
      desc: this.desc,
      projectPath: this.projectPath,
      qrCodeContent: qrCode.qrCodeContent ?? '',
      qrCodeLocalPath: qrCode.qrCodeLocalPath ?? '',
      error: error == null ? undefined : toError(error),
    }
  }

  /**
   * 初始化，在实例化后由调用方显式执行。
   *
   * 这里才去解析各平台的可选依赖，保证依赖缺失时能给出清晰的提示。
   */
  abstract init(): void | Promise<void>

  /** 打开小程序开发者工具 */
  abstract open(): void | Promise<void>

  /** 上传代码作为体验版，并生成体验版二维码 */
  abstract upload(): Promise<DeployResult>

  /** 上传代码作为开发版，并生成预览二维码 */
  abstract preview(): Promise<DeployResult>

  /** 用指定命令打开开发者工具，供各平台复用 */
  protected async openDevTools(cliPath: string, args: string[]): Promise<void> {
    logger.start(`启动${this.label}开发者工具...`, this.projectPath)

    const result = await runCommand(cliPath, args)

    if (result.exitCode !== 0) {
      throw new Error(`启动开发者工具失败：${result.stderr.trim() || `退出码 ${result.exitCode}`}`)
    }
  }
}

/** 把任意抛出物转换为 Error */
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }
  return new Error(typeof error === 'string' ? error : JSON.stringify(error))
}
