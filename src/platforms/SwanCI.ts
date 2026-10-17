import type { DeployResult, MpBaiduConfig } from '../types'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import process from 'node:process'
import BaseCI, { toError } from '../BaseCI'
import { logger } from '../logger'
import { runCommand } from '../utils/exec'
import { resolvePackage } from '../utils/npm'

import { generateQrcodeImageFile, printQrcode2Terminal } from '../utils/qrcode'

interface UploadResponse {
  fileSize: {
    main: number
    sub: Record<string, number>
  }
  /** 体验码内容 */
  schemeUrl: string
  schemeUrlOpti: unknown
  /** 警告信息 */
  warningList: string[]
}

/** 百度开发者工具的默认安装路径 */
function defaultDevToolsPath(): string {
  return process.platform === 'darwin'
    ? '/Applications/百度开发者工具.app'
    : 'C:\\Program Files\\swan-ide-gui'
}

/**
 * 百度小程序 CI。
 *
 * 文档地址：https://smartprogram.baidu.com/docs/develop/devtools/smartapp_cli_function/
 */
export default class SwanCI extends BaseCI {
  private swanBin!: string

  private get options(): MpBaiduConfig {
    return this.platformConfig as MpBaiduConfig
  }

  init(): void {
    this.assertProjectPath()

    try {
      this.swanBin = resolvePackage('swan-toolkit/bin/swan', this.cwd)
    }
    catch (error) {
      throw new Error(
        '请安装依赖 swan-toolkit 后重试：\n  npm install -D swan-toolkit',
        { cause: toError(error) },
      )
    }
  }

  /**
   * 打开开发者工具。
   *
   * 官方 CI 包不支持用命令行打开 IDE，这里通过开发者工具自带的 cli 实现。
   */
  async open(): Promise<void> {
    const isMac = process.platform === 'darwin'
    const devToolsInstallPath = this.options.devToolsInstallPath || defaultDevToolsPath()
    const cliPath = join(devToolsInstallPath, isMac ? 'Contents/MacOS/cli' : 'cli.bat')

    if (!existsSync(cliPath)) {
      throw new Error(`命令行工具路径不存在：${cliPath}`)
    }

    await this.openDevTools(cliPath, ['--project-path', this.projectPath])
  }

  async preview(): Promise<DeployResult> {
    const previewQrcodePath = join(this.projectPath, 'preview.png')
    logger.start(`预览${this.label}`)

    const result = await runCommand(this.swanBin, [
      'preview',
      '--project-path',
      this.projectPath,
      '--token',
      this.options.token,
      '--min-swan-version',
      this.options.minSwanVersion || '3.350.6',
      '--json',
    ])

    if (result.exitCode !== 0) {
      const error = new Error(result.stderr.split('\n')[0] || '预览失败')
      logger.error(`预览失败 ${new Date().toLocaleString()}\n${error.message}`)
      return this.failureResult(error, 'preview')
    }

    try {
      const stdout = JSON.parse(result.stdout)
      const qrContent = stdout.list[0].url as string

      await printQrcode2Terminal(qrContent)
      await generateQrcodeImageFile(previewQrcodePath, qrContent)
      logger.info(`预览二维码已生成，存储在："${previewQrcodePath}"，二维码内容是：${qrContent}`)

      return this.previewResult({
        qrCodeContent: qrContent,
        qrCodeLocalPath: previewQrcodePath,
      })
    }
    catch (error) {
      logger.error(`解析预览结果失败 ${new Date().toLocaleString()}\n${toError(error).message}`)
      return this.failureResult(error, 'preview')
    }
  }

  async upload(): Promise<DeployResult> {
    logger.start(`上传体验版代码到${this.label}后台`)
    logger.info(`本次上传版本号为："${this.version}"，上传描述为："${this.desc}"`)

    const result = await runCommand(this.swanBin, [
      'upload',
      '--project-path',
      this.projectPath,
      '--token',
      this.options.token,
      '--release-version',
      this.version,
      '--min-swan-version',
      this.options.minSwanVersion || '3.350.6',
      '--desc',
      this.desc,
      '--json',
    ])

    if (result.exitCode !== 0) {
      const error = new Error(result.stderr.split('\n')[0] || '上传失败')
      logger.error(`上传失败 ${new Date().toLocaleString()}\n${error.message}`)
      return this.failureResult(error, 'upload')
    }

    try {
      logger.success(`上传成功 ${new Date().toLocaleString()}`)

      const stdout = JSON.parse(result.stdout) as UploadResponse
      const qrContent = stdout.schemeUrl
      const uploadQrcodePath = join(this.projectPath, 'upload.png')

      await printQrcode2Terminal(qrContent)
      await generateQrcodeImageFile(uploadQrcodePath, qrContent)
      logger.info(`体验版二维码已生成，存储在："${uploadQrcodePath}"，二维码内容是：${qrContent}`)

      return this.uploadResult({
        qrCodeContent: qrContent,
        qrCodeLocalPath: uploadQrcodePath,
      })
    }
    catch (error) {
      logger.error(`解析上传结果失败 ${new Date().toLocaleString()}\n${toError(error).message}`)
      return this.failureResult(error, 'upload')
    }
  }
}
