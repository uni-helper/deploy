/** 支持的小程序平台，命名与 uni-app 编译平台保持一致 */
export const PLATFORMS = [
  'mp-weixin',
  'mp-alipay',
  'mp-toutiao',
  'mp-baidu',
  'mp-jd',
  'mp-dingtalk',
] as const

export type Platform = (typeof PLATFORMS)[number]

/** 平台中文名，用于日志输出 */
export const PLATFORM_LABELS: Record<Platform, string> = {
  'mp-weixin': '微信小程序',
  'mp-alipay': '支付宝小程序',
  'mp-toutiao': '字节跳动小程序',
  'mp-baidu': '百度小程序',
  'mp-jd': '京东小程序',
  'mp-dingtalk': '钉钉小程序',
}

export type DeployAction = 'open' | 'preview' | 'upload'

/** 各平台默认的项目产物目录，按优先级排列 */
export const DEFAULT_PROJECT_PATHS: Record<Platform, string[]> = {
  'mp-weixin': ['dist/build/mp-weixin', 'dist/dev/mp-weixin', 'dist/mp-weixin'],
  'mp-alipay': ['dist/build/mp-alipay', 'dist/dev/mp-alipay', 'dist/mp-alipay'],
  'mp-toutiao': ['dist/build/mp-toutiao', 'dist/dev/mp-toutiao', 'dist/mp-toutiao'],
  'mp-baidu': ['dist/build/mp-baidu', 'dist/dev/mp-baidu', 'dist/mp-baidu'],
  'mp-jd': ['dist/build/mp-jd', 'dist/dev/mp-jd', 'dist/mp-jd'],
  'mp-dingtalk': ['dist/build/mp-dingtalk', 'dist/dev/mp-dingtalk', 'dist/mp-dingtalk'],
}

/** unconfig 读取的配置文件前缀 */
export const CONFIG_FILE_NAME = 'unh.config'

/** 配置文件支持的扩展名 */
export const CONFIG_FILE_EXTENSIONS = ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs']

/**
 * 本工具在 `unh.config.ts` 中占用的配置字段。
 *
 * `unh.config.ts` 由 `@uni-helper/unh` 与 `@uni-helper/deploy` 共用，
 * 因此本工具的全部配置都收敛到该字段下，避免与其它工具的同名字段冲突，
 * 也便于后续继续增加新的配置项。
 */
export const CONFIG_DEPLOY_KEY = 'deploy'
