/**
 * @uni-helper/deploy
 *
 * uni-app 小程序构建产物自动化部署工具。
 *
 * 提供 SDK 与 CLI 两种调用方式：
 * - SDK：`import { deploy, upload, preview, open } from '@uni-helper/deploy'`
 * - CLI：`npx uni-deploy upload --platform mp-weixin`
 */

/* 基类，便于接入更多平台 */
export { default as BaseCI, toError } from './BaseCI'

/* 配置 */
export {
  defaultConfig,
  defineConfig,
  loadConfig,
  resolvePlatforms,
  resolveProjectPath,
} from './config'

/* 常量 */
export {
  CONFIG_DEPLOY_KEY,
  CONFIG_FILE_EXTENSIONS,
  CONFIG_FILE_NAME,
  DEFAULT_PROJECT_PATHS,
  PLATFORM_LABELS,
  PLATFORMS,
} from './constants'

/* 类型 */
export type { DeployAction, Platform } from './constants'

/* 部署 API */
export { createCI, deploy, normalizePlatform, normalizePlatforms, open, preview, upload } from './deploy'

/* 日志 */
export { consola, logger } from './logger'
/* 各平台实现 */
export { default as AlipayCI } from './platforms/AlipayCI'
export { default as DingtalkCI } from './platforms/DingtalkCI'
export { default as JdCI } from './platforms/JdCI'
export { default as SwanCI } from './platforms/SwanCI'
export { default as TTCI } from './platforms/TTCI'

export { default as WeappCI } from './platforms/WeappCI'
export type {
  AlipayClientType,
  DeployConfig,
  DeployConfigFile,
  DeployHooks,
  DeployOptions,
  DeployResult,
  DeployUserConfig,
  DingtalkProjectType,
  MpAlipayConfig,
  MpBaiduConfig,
  MpDingtalkConfig,
  MpJdConfig,
  MpToutiaoConfig,
  MpWeixinConfig,
  PlatformConfig,
  PreviewCompleteHook,
  QrCodeResult,
  ResolvedConfig,
  ToutiaoSetting,
  UploadCompleteHook,
  WeappProjectType,
  WeappSetting,
} from './types'

/* 工具函数 */
export { compareVersion } from './utils/compareVersion'
export { generateQrcodeImageFile, printQrcode2Terminal, readQrcodeImageContent } from './utils/qrcode'
