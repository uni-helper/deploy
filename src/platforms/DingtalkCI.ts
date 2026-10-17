import type { DeployResult, MpDingtalkConfig } from '../types'
import type { MiniAppOpenSDK } from '../types/internal'

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import BaseCI, { toError } from '../BaseCI'
import { logger } from '../logger'

import { loadPackage } from '../utils/npm'
import { generateQrcodeImageFile } from '../utils/qrcode'

/**
 * 钉钉小程序 CI。
 *
 * 基于 dingtalk-miniapp-opensdk：
 * https://github.com/open-dingtalk/dingtalk-design-cli/blob/develop/packages/opensdk/package.json
 */
export default class DingtalkCI extends BaseCI {
  private sdk!: MiniAppOpenSDK

  private entryPage = ''

  private get options(): MpDingtalkConfig {
    return this.platformConfig as MpDingtalkConfig
  }

  init(): void {
    this.assertProjectPath()

    try {
      this.sdk = loadPackage('dingtalk-miniapp-opensdk', this.cwd).sdk
    }
    catch (error) {
      throw new Error(
        '请安装依赖 dingtalk-miniapp-opensdk 后重试，该依赖用于 CI 预览、上传钉钉小程序：\n'
        + '  npm install -D dingtalk-miniapp-opensdk',
        { cause: toError(error) },
      )
    }

    if (!this.sdk) {
      throw new Error('dingtalk-miniapp-opensdk 未导出 sdk，请确认依赖版本')
    }

    this.sdk.setConfig({
      appKey: '',
      appSecret: '',
      accessToken: this.options.token,
      host: 'https://oapi.dingtalk.com',
    })

    // 读取入口页面，预览时作为默认页面
    const appJsonPath = join(this.projectPath, 'app.json')
    if (existsSync(appJsonPath)) {
      try {
        const appInfo = JSON.parse(readFileSync(appJsonPath, 'utf-8'))
        this.entryPage = appInfo.pages?.[0] ?? ''
      }
      catch {
        logger.warn(`解析 ${appJsonPath} 失败，将使用默认入口页`)
      }
    }
  }

  /** 钉钉和支付宝小程序共用开发者工具 */
  async open(): Promise<void> {
    const { devToolsInstallPath, projectType = 'dingtalk-biz' } = this.options

    let minidev: any
    try {
      minidev = loadPackage('minidev', this.cwd)
    }
    catch (error) {
      throw new Error(
        '请安装依赖 minidev 后重试，该依赖用于编译后自动打开小程序开发者工具：\n'
        + '  npm install -D minidev',
        { cause: toError(error) },
      )
    }

    logger.start(`启动${this.label}开发者工具...`, this.projectPath)

    try {
      await minidev.minidev.startIde({
        project: this.projectPath,
        projectType,
        ...(devToolsInstallPath ? { appPath: devToolsInstallPath } : {}),
      })
    }
    catch (error) {
      throw new Error(`启动开发者工具失败：${toError(error).message}`, { cause: toError(error) })
    }
  }

  /**
   * 预览。
   *
   * 特性：CI 内部会自己打印二维码；预览版不会上传到后台，只有预览码作为入口访问。
   */
  async preview(): Promise<DeployResult> {
    try {
      logger.start(`预览${this.label}`)

      const previewUrl = await this.sdk.previewBuild({
        project: this.projectPath,
        miniAppId: this.options.appid,
        page: this.entryPage,
        query: '',
        ignoreHttpReqPermission: true,
        ignoreWebViewDomainCheck: true,
        buildTarget: 'Preview',
        onProgressUpdate(info) {
          if (info.status === 'failed') {
            logger.error('构建失败')
          }
          else if (info.status === 'overtime') {
            logger.error('构建超时')
          }
          else if (info.status === 'success') {
            logger.success('构建成功')
          }
        },
      })

      const previewQrcodePath = join(this.projectPath, 'preview.png')
      await generateQrcodeImageFile(previewQrcodePath, previewUrl)
      logger.info(`预览版二维码已生成，存储在："${previewQrcodePath}"，二维码内容是："${previewUrl}"`)

      return this.previewResult({
        qrCodeContent: previewUrl,
        qrCodeLocalPath: previewQrcodePath,
      })
    }
    catch (error) {
      logger.error(`预览失败 ${new Date().toLocaleString()}\n${toError(error).message}`)
      return this.failureResult(error, 'preview')
    }
  }

  /**
   * 上传。
   *
   * 特性：CI 内部暂时未支持上传后返回体验码，
   * 等待官方支持：https://github.com/open-dingtalk/dingtalk-design-cli/issues/34
   */
  async upload(): Promise<DeployResult> {
    try {
      logger.start(`上传代码到${this.label}后台`)
      logger.info(`本次上传版本号为："${this.version}"`)

      let reported = false

      const result = await this.sdk.miniUpload({
        project: this.projectPath,
        miniAppId: this.options.appid,
        packageVersion: this.version,
        onProgressUpdate(info) {
          const status = info.status
          const data = (info.data ?? {}) as any

          if (status === 'success') {
            if (!reported) {
              logger.success(`构建成功，本次上传版本号 ${data.version ?? ''}`)
              reported = true
            }
          }
          else if (status === 'building') {
            logger.info('构建中，正在查询构建结果。')
          }
          else if (status === 'overtime') {
            logger.error('构建超时，请重试')
          }
          else if (status === 'failed') {
            logger.error('构建失败', data.log ?? '')
          }
        },
      })

      logger.success(`版本 ${result?.packageVersion ?? this.version} 上传成功 ${new Date().toLocaleString()}`)

      return this.uploadResult({})
    }
    catch (error) {
      logger.error(`体验版上传失败 ${new Date().toLocaleString()}\n${toError(error).message}`)
      return this.failureResult(error, 'upload')
    }
  }
}
