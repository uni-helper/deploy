import type { DeployAction, Platform } from './constants'

/** 平台配置的公共字段 */
export interface PlatformBaseConfig {
  /** 该项目产物目录，优先于全局 `projectPath` */
  projectPath?: string
  /** 该平台使用的版本号，优先于全局 `version` */
  version?: string
  /** 该平台使用的版本描述，优先于全局 `desc` */
  desc?: string
}

/** 微信小程序项目类型 */
export type WeappProjectType = 'miniProgram' | 'miniGame' | 'miniProgramPlugin' | 'miniGamePlugin'

/** 微信小程序编译设置，对应微信开发者工具中的设置项 */
export interface WeappSetting {
  /** 对应于微信开发者工具的 "es6 转 es5" */
  es6?: boolean
  /** 对应于微信开发者工具的 "增强编译" */
  es7?: boolean
  /** "增强编译" 开启时，是否禁用 JS 文件严格模式 */
  disableUseStrict?: boolean
  /** 上传时压缩 JS 代码 */
  minifyJS?: boolean
  /** 上传时压缩 WXML 代码 */
  minifyWXML?: boolean
  /** 上传时压缩 WXSS 代码 */
  minifyWXSS?: boolean
  /** 上传时压缩所有代码，对应于微信开发者工具的 "上传时压缩代码" */
  minify?: boolean
  /** 对应于微信开发者工具的 "上传时进行代码保护" */
  codeProtect?: boolean
  /** 对应于微信开发者工具的 "上传时样式自动补全" */
  autoPrefixWXSS?: boolean
}

/** 微信小程序配置 */
export interface MpWeixinConfig extends PlatformBaseConfig {
  /** 小程序 / 小游戏的 appid */
  appid: string
  /** 私钥文件路径，与 `privateKey` 二选一 */
  privateKeyPath?: string
  /** 私钥文本内容，与 `privateKeyPath` 二选一 */
  privateKey?: string
  /** 微信开发者工具安装路径 */
  devToolsInstallPath?: string
  /** 项目类型，默认为 `miniProgram` */
  type?: WeappProjectType
  /** 上传需要排除的目录 */
  ignores?: string[]
  /** 指定使用哪一个 ci 机器人，可选值：1 ~ 30 */
  robot?: number
  /** 编译设置 */
  setting?: WeappSetting
  /** 使用的线程数 */
  threads?: number
  /** 是否使用异步方式上传 */
  useCOS?: boolean
}

/** 字节跳动小程序编译设置 */
export interface ToutiaoSetting {
  /** 跳过域名检查 */
  skipDomainCheck?: boolean
}

/** 字节跳动小程序配置 */
export interface MpToutiaoConfig extends PlatformBaseConfig {
  /** 绑定的邮箱账号 */
  email: string
  /** 密码 */
  password: string
  /** 编译设置 */
  setting?: ToutiaoSetting
}

/** 支付宝小程序终端类型 */
export type AlipayClientType
  /** 支付宝 */
  = | 'alipay'
  /** AMPE */
    | 'ampe'
  /** 高德 */
    | 'amap'
  /** 天猫精灵 */
    | 'genie'
  /** ALIOS */
    | 'alios'
  /** UC */
    | 'uc'
  /** 夸克 */
    | 'quark'
  /** 口碑 */
    | 'koubei'
  /** IoT */
    | 'alipayiot'
  /** 菜鸟 */
    | 'cainiao'
  /** 阿里健康（医蝶谷） */
    | 'alihealth'
  /** 阿里医院 */
    | 'health'

/** 支付宝系列小程序配置 */
export interface MpAlipayConfig extends PlatformBaseConfig {
  /** 小程序 appid */
  appid: string
  /** 工具 id */
  toolId: string
  /** 私钥文件路径，与 `privateKey` 二选一 */
  privateKeyPath?: string
  /** 私钥文本内容，与 `privateKeyPath` 二选一 */
  privateKey?: string
  /** 小程序开发者工具安装路径 */
  devToolsInstallPath?: string
  /** 上传的终端，默认为 `alipay` */
  clientType?: AlipayClientType
  /** 上传时想要删除的一个版本 */
  deleteVersion?: string
  /** 上传成功后是否自动设置为体验版本 */
  experience?: boolean
}

/** 钉钉小程序应用类型 */
export type DingtalkProjectType
  /** 第三方个人应用 */
  = | 'dingtalk-personal'
  /** 第三方企业应用 */
    | 'dingtalk-biz-isv'
  /** 企业内部应用 */
    | 'dingtalk-biz'
  /** 企业定制应用 */
    | 'dingtalk-biz-custom'
  /** 工作台组件 */
    | 'dingtalk-biz-worktab-plugin'

/** 钉钉小程序配置 */
export interface MpDingtalkConfig extends PlatformBaseConfig {
  /** 钉钉小程序 appid，即钉钉开放平台后台应用管理的 MiniAppId */
  appid: string
  /** 令牌，从钉钉后台获取 */
  token: string
  /** 小程序开发者工具安装路径 */
  devToolsInstallPath?: string
  /** 钉钉应用类型，默认为 `dingtalk-biz`（企业内部应用） */
  projectType?: DingtalkProjectType
}

/** 百度小程序配置 */
export interface MpBaiduConfig extends PlatformBaseConfig {
  /** 有该小程序发布权限的登录密钥 */
  token: string
  /** 最低基础库版本，默认为 `3.350.6` */
  minSwanVersion?: string
  /** 小程序开发者工具安装路径 */
  devToolsInstallPath?: string
}

/** 京东小程序配置 */
export interface MpJdConfig extends PlatformBaseConfig {
  /** 秘钥信息 */
  privateKey: string
  /** 指定使用哪一个 ci 机器人，可选值：1 ~ 30 */
  robot?: number
  /** 指定需要排除的规则。无需配置以 `.` 开头的隐藏文件，它们将默认被忽略，如 `.git` */
  ignores?: string[]
}

/** 已完成的一次预览 / 上传结果 */
export interface DeployResult {
  /** 平台 */
  platform: Platform
  /** 执行的动作 */
  action: DeployAction
  /** 是否成功 */
  success: boolean
  /** 版本号 */
  version: string
  /** 版本描述 */
  desc: string
  /** 实际操作的项目目录 */
  projectPath: string
  /** 二维码内容，未能获取时为空字符串 */
  qrCodeContent: string
  /** 二维码图片的本地路径，未能生成时为空字符串 */
  qrCodeLocalPath: string
  /** 失败时的错误 */
  error?: Error
}

/** 预览完成后的回调 */
export type PreviewCompleteHook = (result: DeployResult) => void | Promise<void>

/** 上传完成后的回调 */
export type UploadCompleteHook = (result: DeployResult) => void | Promise<void>

/** 生命周期回调 */
export interface DeployHooks {
  /** 执行预览命令后触发 */
  onPreviewComplete?: PreviewCompleteHook
  /** 执行上传命令后触发 */
  onUploadComplete?: UploadCompleteHook
}

/** 部署配置 */
export interface DeployConfig {
  /** 进程的工作目录，默认为 `process.cwd()` */
  'cwd'?: string
  /** 发布版本号，默认依次读取 `manifest.json` 的 `versionName`、`package.json` 的 `version` */
  'version'?: string
  /** 版本发布描述 */
  'desc'?: string
  /** 目标项目目录，对所有小程序生效，默认为各平台在 `dist/build` 下的产物目录 */
  'projectPath'?: string
  /**
   * 默认操作的平台。
   *
   * CLI 未传 `--platform` 时使用；未配置时自动取所有已配置的平台。
   */
  'platforms'?: Platform[]
  /** 微信小程序配置 */
  'mp-weixin'?: MpWeixinConfig
  /** 支付宝小程序配置 */
  'mp-alipay'?: MpAlipayConfig
  /** 字节跳动小程序配置 */
  'mp-toutiao'?: MpToutiaoConfig
  /** 百度小程序配置 */
  'mp-baidu'?: MpBaiduConfig
  /** 京东小程序配置 */
  'mp-jd'?: MpJdConfig
  /** 钉钉小程序配置 */
  'mp-dingtalk'?: MpDingtalkConfig
}

/** 用户传入的配置 */
export type DeployUserConfig = DeployConfig

/**
 * `unh.config.ts` 的文件结构。
 *
 * `unh.config.ts` 由 `@uni-helper/unh` 与 `@uni-helper/deploy` 共用，
 * 本工具只读取 `deploy` 字段，其余字段（`platform`、`hooks` 等）原样忽略。
 *
 * @example
 * ```ts
 * import { defineConfig } from '@uni-helper/deploy'
 *
 * export default defineConfig({
 *   deploy: {
 *     'mp-weixin': { appid: 'wx1234567890' },
 *   },
 * })
 * ```
 */
export interface DeployConfigFile {
  /** 本工具的配置，全部字段都收敛在这一层 */
  deploy?: DeployUserConfig
  /** 允许放置其它工具的配置，本工具不会读取 */
  [key: string]: unknown
}

/** 解析后的配置，`cwd` 等字段已有确定取值 */
export type ResolvedConfig = DeployConfig & { cwd: string }

/** 平台配置的联合类型 */
export type PlatformConfig
  = | MpWeixinConfig
    | MpAlipayConfig
    | MpToutiaoConfig
    | MpBaiduConfig
    | MpJdConfig
    | MpDingtalkConfig

/** 预览 / 上传时产出的二维码信息 */
export interface QrCodeResult {
  /** 二维码内容 */
  qrCodeContent: string
  /** 二维码图片的本地路径 */
  qrCodeLocalPath: string
}

/** 部署选项 */
export interface DeployOptions extends DeployHooks {
  /** 要执行的动作，默认为 `upload` */
  action?: DeployAction
  /** 要操作的平台，默认为配置中 `platforms`，未配置时取所有已配置的平台 */
  platform?: Platform | Platform[]
  /** 进程的工作目录 */
  cwd?: string
  /** 内联配置，会覆盖配置文件中的同名配置 */
  config?: DeployUserConfig
  /** 自定义配置文件路径，传 `false` 表示不读取配置文件 */
  configFile?: string | false
}
