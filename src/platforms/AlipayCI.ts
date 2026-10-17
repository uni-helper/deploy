import type { DeployResult, MpAlipayConfig } from '../types'
import { existsSync, readFileSync } from 'node:fs'

import { join } from 'node:path'
import BaseCI, { toError } from '../BaseCI'
import { logger } from '../logger'
import { compareVersion } from '../utils/compareVersion'
import { loadPackage } from '../utils/npm'

import { generateQrcodeImageFile, printQrcode2Terminal, readQrcodeImageContent } from '../utils/qrcode'

/**
 * 支付宝系列小程序 CI。
 *
 * 文档地址：https://opendocs.alipay.com/mini/02q29z
 */
export default class AlipayCI extends BaseCI {
  private minidev: any

  private get options(): MpAlipayConfig {
    return this.platformConfig as MpAlipayConfig
  }

  init(): void {
    this.assertProjectPath()

    try {
      this.minidev = loadPackage('minidev', this.cwd)
    }
    catch (error) {
      throw new Error(
        '请安装依赖 minidev 后重试：\n  npm install -D minidev',
        { cause: toError(error) },
      )
    }

    const { toolId, privateKey: configuredPrivateKey, privateKeyPath: configuredPrivateKeyPath } = this.options

    let privateKey = configuredPrivateKey
    if (!privateKey) {
      if (!configuredPrivateKeyPath) {
        throw new Error('"mp-alipay" 需要配置 privateKey 或 privateKeyPath')
      }

      const privateKeyPath = this.resolveFromCwd(configuredPrivateKeyPath)
      if (!existsSync(privateKeyPath)) {
        throw new Error(`"mp-alipay.privateKeyPath" 配置的路径不存在：${privateKeyPath}`)
      }
      privateKey = readFileSync(privateKeyPath, 'utf-8')
    }

    this.minidev.useDefaults({
      config: {
        defaults: {
          'alipay.authentication.privateKey': privateKey,
          'alipay.authentication.toolId': toolId,
        },
      },
    })
  }

  async open(): Promise<void> {
    const { devToolsInstallPath } = this.options

    logger.start(`启动${this.label}开发者工具...`, this.projectPath)

    try {
      await this.minidev.minidev.startIde({
        project: this.projectPath,
        ...(devToolsInstallPath ? { appPath: devToolsInstallPath } : {}),
      })
    }
    catch (error) {
      throw new Error(`启动开发者工具失败：${toError(error).message}`, { cause: toError(error) })
    }
  }

  async preview(): Promise<DeployResult> {
    const { appid: appId, clientType = 'alipay' } = this.options

    try {
      logger.start(`预览${this.label}`)

      const previewResult = await this.minidev.minidev.preview({
        project: this.projectPath,
        appId,
        clientType,
        autoPush: false,
      })

      const previewQrcodePath = join(this.projectPath, 'preview.png')
      // 注意：这是二维码的线上图片地址，不是二维码中的内容
      const qrcodeUrl = previewResult.qrcodeUrl
      const qrcodeContent = await readQrcodeImageContent(qrcodeUrl)

      await printQrcode2Terminal(qrcodeContent)
      await generateQrcodeImageFile(previewQrcodePath, qrcodeContent)
      logger.info(`预览版二维码已生成，存储在："${previewQrcodePath}"，二维码内容是："${qrcodeContent}"`)

      return this.previewResult({
        qrCodeContent: qrcodeContent,
        qrCodeLocalPath: previewQrcodePath,
      })
    }
    catch (error) {
      logger.error(`预览失败 ${new Date().toLocaleString()}\n${toError(error).message}`)
      return this.failureResult(error, 'preview')
    }
  }

  async upload(): Promise<DeployResult> {
    const { clientType = 'alipay', appid: appId, deleteVersion, experience = true } = this.options

    try {
      logger.start(`上传代码到${this.label}后台`, clientType)
      logger.info(`本次上传版本号为："${this.version}"`)

      // SDK 上传不支持设置描述信息；版本号必须大于现有版本号
      const latestVersion = await this.minidev.minidev.app.getUploadedVersion({ appId, clientType })

      if (this.version && latestVersion && compareVersion(this.version, latestVersion) <= 0) {
        throw new Error(`上传版本号 "${this.version}" 必须大于最新上传版本 "${latestVersion}"`)
      }

      const result = await this.minidev.minidev.upload({
        project: this.projectPath,
        appId,
        version: this.version,
        clientType,
        experience,
        deleteVersion: deleteVersion || latestVersion, // 默认删除上个版本
      })

      // 注意：这是二维码的线上图片地址，不是二维码中的内容
      const qrcodeUrl = result.experienceQrCodeUrl
      const qrcodeContent = qrcodeUrl ? await readQrcodeImageContent(qrcodeUrl) : ''
      const uploadQrcodePath = join(this.projectPath, 'upload.png')

      if (qrcodeContent) {
        await printQrcode2Terminal(qrcodeContent)
        await generateQrcodeImageFile(uploadQrcodePath, qrcodeContent)
        logger.info(`体验版二维码已生成，存储在："${uploadQrcodePath}"，二维码内容是："${qrcodeContent}"`)
      }

      return this.uploadResult({
        qrCodeContent: qrcodeContent,
        qrCodeLocalPath: qrcodeContent ? uploadQrcodePath : '',
      })
    }
    catch (error) {
      logger.error(`体验版上传失败 ${new Date().toLocaleString()}\n${toError(error).message}`)
      return this.failureResult(error, 'upload')
    }
  }
}
