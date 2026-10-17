import type { DeployResult, MpJdConfig } from '../types'

import { join } from 'node:path'
import BaseCI, { toError } from '../BaseCI'
import { logger } from '../logger'
import { loadPackage } from '../utils/npm'

import { generateQrcodeImageFile, printQrcode2Terminal, readQrcodeImageContent } from '../utils/qrcode'

/**
 * 京东小程序 CI。
 *
 * 文档地址：https://mp-docs.jd.com/doc/dev/devtools/1597
 */
export default class JdCI extends BaseCI {
  private jdCi: any

  private get options(): MpJdConfig {
    return this.platformConfig as MpJdConfig
  }

  init(): void {
    this.assertProjectPath()

    try {
      this.jdCi = loadPackage('jd-miniprogram-ci', this.cwd)
    }
    catch (error) {
      throw new Error(
        '请安装依赖 jd-miniprogram-ci 后重试：\n  npm install -D jd-miniprogram-ci',
        { cause: toError(error) },
      )
    }
  }

  async open(): Promise<void> {
    logger.warn('京东小程序不支持 "open" 动作打开开发者工具')
  }

  async preview(): Promise<DeployResult> {
    const { privateKey, ignores } = this.options
    const previewQrcodePath = join(this.projectPath, 'preview.jpg')

    try {
      logger.start(`预览${this.label}`)
      logger.info(`本次预览版本号为："${this.version}"，描述为："${this.desc}"`)

      const result = await this.jdCi.preview({
        desc: this.desc,
        privateKey,
        projectPath: this.projectPath,
        uv: this.version,
        qrcodeFormat: 'image',
        ignores,
      })

      const qrcodeContent = await readQrcodeImageContent(result.imgUrl)
      await generateQrcodeImageFile(previewQrcodePath, qrcodeContent)
      await printQrcode2Terminal(qrcodeContent)
      logger.info(`预览二维码已生成，存储在："${previewQrcodePath}"，二维码内容是："${qrcodeContent}"`)

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
    const { privateKey, robot, ignores } = this.options
    const uploadQrcodePath = join(this.projectPath, 'upload.jpg')

    try {
      logger.start(`上传代码到${this.label}后台`)
      logger.info(`本次上传版本号为："${this.version}"，上传描述为："${this.desc}"`)

      const result = await this.jdCi.upload({
        desc: this.desc,
        privateKey,
        projectPath: this.projectPath,
        uv: this.version,
        qrcodeFormat: 'image',
        robot,
        ignores,
      })

      const qrcodeContent = await readQrcodeImageContent(result.imgUrl)
      await generateQrcodeImageFile(uploadQrcodePath, qrcodeContent)
      await printQrcode2Terminal(qrcodeContent)
      logger.info(`体验版二维码已生成，存储在："${uploadQrcodePath}"，二维码内容是："${qrcodeContent}"`)

      return this.uploadResult({
        qrCodeContent: qrcodeContent,
        qrCodeLocalPath: uploadQrcodePath,
      })
    }
    catch (error) {
      logger.error(`上传失败 ${new Date().toLocaleString()}\n${toError(error).message}`)
      return this.failureResult(error, 'upload')
    }
  }
}
