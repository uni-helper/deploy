import type { DeployResult, MpWeixinConfig } from '../types'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'

import { join } from 'node:path'
import process from 'node:process'
import BaseCI, { toError } from '../BaseCI'
import { logger } from '../logger'

import { loadPackage } from '../utils/npm'
import { generateQrcodeImageFile, printQrcode2Terminal, readQrcodeImageContent } from '../utils/qrcode'

/** 微信开发者工具的默认安装路径 */
function defaultDevToolsPath(): string {
  return process.platform === 'darwin'
    ? '/Applications/wechatwebdevtools.app'
    : 'C:\\Program Files (x86)\\Tencent\\微信web开发者工具'
}

export default class WeappCI extends BaseCI {
  private project: any

  private ci: any

  private devToolsInstallPath!: string

  private get options(): MpWeixinConfig {
    return this.platformConfig as MpWeixinConfig
  }

  async init(): Promise<void> {
    this.assertProjectPath()

    try {
      this.ci = loadPackage('miniprogram-ci', this.cwd)
    }
    catch (error) {
      throw new Error(
        `请安装依赖 miniprogram-ci 后重试：\n  npm install -D miniprogram-ci`,
        { cause: toError(error) },
      )
    }

    const { appid, privateKey: configuredPrivateKey, privateKeyPath: configuredPrivateKeyPath } = this.options

    let privateKey = configuredPrivateKey
    if (!privateKey) {
      if (!configuredPrivateKeyPath) {
        throw new Error('"mp-weixin" 需要配置 privateKey 或 privateKeyPath')
      }

      const privateKeyPath = this.resolveFromCwd(configuredPrivateKeyPath)
      if (!existsSync(privateKeyPath)) {
        throw new Error(`"mp-weixin.privateKeyPath" 配置的路径不存在：${privateKeyPath}`)
      }
      privateKey = await readFile(privateKeyPath, 'utf-8')
    }

    this.devToolsInstallPath = this.options.devToolsInstallPath || defaultDevToolsPath()

    this.project = new this.ci.Project({
      appid,
      type: this.options.type ?? 'miniProgram',
      projectPath: this.projectPath,
      privateKey,
      ignores: this.options.ignores,
    })
  }

  async open(): Promise<void> {
    const isWindows = process.platform === 'win32'
    const cliPath = join(
      this.devToolsInstallPath,
      isWindows ? 'cli.bat' : 'Contents/MacOS/cli',
    )

    if (!existsSync(this.devToolsInstallPath)) {
      throw new Error(`微信开发者工具安装路径不存在：${this.devToolsInstallPath}`)
    }

    if (!(await this.isIdePortEnabled())) {
      throw new Error(
        '工具的服务端口已关闭。要使用命令行调用工具，请打开工具 -> 设置 -> 安全设置，将服务端口开启。'
        + '详细信息: https://developers.weixin.qq.com/miniprogram/dev/devtools/cli.html',
      )
    }

    if (!existsSync(cliPath)) {
      throw new Error(`命令行工具路径不存在：${cliPath}`)
    }

    await this.openDevTools(cliPath, ['open', '--project', this.projectPath])
  }

  /** 通过 .ide-status 文件判断开发者工具的服务端口是否开启 */
  private async isIdePortEnabled(): Promise<boolean> {
    const isWindows = process.platform === 'win32'
    const installPath = isWindows
      ? this.devToolsInstallPath
      : `${this.devToolsInstallPath}/Contents/MacOS`

    const md5 = createHash('md5').update(installPath).digest('hex')
    const ideStatusFile = join(
      homedir(),
      isWindows
        ? `AppData/Local/微信开发者工具/User Data/${md5}/Default/.ide-status`
        : `Library/Application Support/微信开发者工具/${md5}/Default/.ide-status`,
    )

    if (!existsSync(ideStatusFile)) {
      return false
    }

    const status = (await readFile(ideStatusFile, 'utf-8')).trim()
    return status !== 'Off'
  }

  /** 输出产物体积信息 */
  private logPackageInfo(uploadResult: any): void {
    if (!uploadResult?.subPackageInfo) {
      return
    }

    const allPackageInfo = uploadResult.subPackageInfo.find((item: any) => item.name === '__FULL__')
    const mainPackageInfo = uploadResult.subPackageInfo.find((item: any) => item.name === '__APP__')

    if (!allPackageInfo) {
      return
    }

    const extInfo = `本次上传 ${(allPackageInfo.size / 1024).toFixed(2)}kb${
      mainPackageInfo ? `，其中主包 ${(mainPackageInfo.size / 1024).toFixed(2)}kb` : ''}`

    logger.success(`${extInfo}`)
  }

  async preview(): Promise<DeployResult> {
    try {
      logger.start(`上传开发版代码到${this.label}后台并预览`)
      logger.info(`本次预览版本号为："${this.version}"`)

      const previewQrcodePath = join(this.projectPath, 'preview.jpg')

      const uploadResult = await this.ci.preview({
        project: this.project,
        version: this.version,
        desc: this.desc,
        robot: this.options.robot,
        setting: this.options.setting,
        qrcodeFormat: 'image',
        qrcodeOutputDest: previewQrcodePath,
        threads: this.options.threads,
        useCOS: this.options.useCOS,
      })

      this.logPackageInfo(uploadResult)

      let qrContent = ''
      try {
        qrContent = await readQrcodeImageContent(previewQrcodePath)
        await printQrcode2Terminal(qrContent)
        logger.info(`预览二维码已生成，存储在："${previewQrcodePath}"，二维码内容是：${qrContent}`)
      }
      catch (error) {
        logger.error(`获取预览二维码失败：${toError(error).message}`)
      }

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
      logger.start(`上传体验版代码到${this.label}后台`)
      logger.info(`本次上传版本号为："${this.version}"，上传描述为："${this.desc}"`)

      const uploadResult = await this.ci.upload({
        project: this.project,
        version: this.version,
        desc: this.desc,
        robot: this.options.robot,
        setting: this.options.setting,
        threads: this.options.threads,
        useCOS: this.options.useCOS,
      })

      this.logPackageInfo(uploadResult)

      // 体验码规则：https://open.weixin.qq.com/sns/getexpappinfo?appid=xxx&path=入口路径.html#wechat-redirect
      const qrContent = `https://open.weixin.qq.com/sns/getexpappinfo?appid=${this.options.appid}#wechat-redirect`
      const uploadQrcodePath = join(this.projectPath, 'upload.png')

      try {
        await printQrcode2Terminal(qrContent)
        await generateQrcodeImageFile(uploadQrcodePath, qrContent)
        logger.info(`体验版二维码已生成，存储在："${uploadQrcodePath}"，二维码内容是："${qrContent}"`)
        logger.info('可能需要您前往微信后台，将当前上传版本设置为"体验版"')
        logger.info('若本次上传的 robot 机器人和上次一致，并且之前已经在微信后台设置其为"体验版"，则本次无需再次设置')
      }
      catch (error) {
        logger.error(`体验二维码生成失败：${toError(error).message}`)
      }

      return this.uploadResult({ qrCodeContent: qrContent, qrCodeLocalPath: uploadQrcodePath })
    }
    catch (error) {
      logger.error(`上传失败 ${new Date().toLocaleString()}\n${toError(error).message}`)
      return this.failureResult(error, 'upload')
    }
  }
}
