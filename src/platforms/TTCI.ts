import type { DeployResult, MpToutiaoConfig } from '../types'

import { join } from 'node:path'
import BaseCI, { toError } from '../BaseCI'
import { logger } from '../logger'
import { loadPackage } from '../utils/npm'

import { printQrcode2Terminal } from '../utils/qrcode'

/**
 * 字节跳动（抖音）小程序 CI。
 *
 * 文档地址：https://microapp.bytedance.com/docs/zh-CN/mini-app/develop/developer-instrument/development-assistance/ide-order-instrument
 */
export default class TTCI extends BaseCI {
  private tt: any

  private get options(): MpToutiaoConfig {
    return this.platformConfig as MpToutiaoConfig
  }

  init(): void {
    this.assertProjectPath()

    try {
      this.tt = loadPackage('tt-ide-cli', this.cwd)
    }
    catch (error) {
      throw new Error(
        '请安装依赖 tt-ide-cli 后重试：\n  npm install -D tt-ide-cli',
        { cause: toError(error) },
      )
    }
  }

  private async beforeCheck(): Promise<void> {
    await this.tt.loginByEmail({
      email: this.options.email,
      password: this.options.password,
      dontSaveCookie: false,
    })
  }

  async open(): Promise<void> {
    logger.start(`启动${this.label}开发者工具...`, this.projectPath)

    try {
      await this.tt.open({ project: { path: this.projectPath } })
      logger.success('打开 IDE 成功')
    }
    catch (error) {
      throw new Error(`打开 IDE 失败：${toError(error).message}`, { cause: toError(error) })
    }
  }

  async preview(): Promise<DeployResult> {
    try {
      await this.beforeCheck()
      logger.start(`预览${this.label}`)

      const previewQrcodePath = join(this.projectPath, 'preview.png')
      const previewResult = await this.tt.preview({
        project: { path: this.projectPath },
        page: { path: '' },
        qrcode: { format: 'imageFile', output: previewQrcodePath },
        copyToClipboard: true,
        cache: true,
        ideConfig: { skipDomainCheck: this.options.setting?.skipDomainCheck },
      })

      const qrContent = previewResult.shortUrl ?? ''
      await printQrcode2Terminal(qrContent)
      logger.info(
        `预览二维码已生成，存储在："${previewQrcodePath}"，二维码内容是：${qrContent}${
          previewResult.expireTime ? `，过期时间：${new Date(previewResult.expireTime * 1000).toLocaleString()}` : ''}`,
      )

      return this.previewResult({
        qrCodeContent: qrContent,
        qrCodeLocalPath: previewQrcodePath,
      })
    }
    catch (error) {
      logger.error(`预览失败 ${new Date().toLocaleString()}\n${toError(error).message}`)
      return this.failureResult(error, 'preview')
    }
  }

  async upload(): Promise<DeployResult> {
    try {
      await this.beforeCheck()
      logger.start(`上传代码到${this.label}开放平台后台`)
      logger.info(`本次上传版本号为："${this.version}"，上传描述为："${this.desc}"`)

      const uploadQrcodePath = join(this.projectPath, 'upload.png')
      const uploadResult = await this.tt.upload({
        project: { path: this.projectPath },
        qrcode: { format: 'imageFile', output: uploadQrcodePath },
        version: this.version,
        changeLog: this.desc,
        needUploadSourcemap: true,
        copyToClipboard: false,
      })

      const qrContent = uploadResult.shortUrl ?? ''
      await printQrcode2Terminal(qrContent)
      logger.info(
        `体验版二维码已生成，存储在："${uploadQrcodePath}"，二维码内容是："${qrContent}"${
          uploadResult.expireTime ? `，过期时间：${new Date(uploadResult.expireTime * 1000).toLocaleString()}` : ''}`,
      )

      return this.uploadResult({
        qrCodeContent: qrContent,
        qrCodeLocalPath: uploadQrcodePath,
      })
    }
    catch (error) {
      logger.error(`上传失败 ${new Date().toLocaleString()}\n${toError(error).message}`)
      return this.failureResult(error, 'upload')
    }
  }
}
