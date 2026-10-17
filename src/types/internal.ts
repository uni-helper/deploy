/**
 * 各平台官方 CI 依赖的类型声明。
 *
 * 这些依赖体积较大且并非必装，因此不安装为 devDependencies，
 * 此处手动补充最小可用的类型。
 */

interface IOpenSDKConfig {
  appKey: string
  appSecret: string
  accessToken?: string
  host?: string
}

export interface ITaskProgressMessage<T> {
  status: 'pending' | 'building' | 'success' | 'failed' | 'overtime'
  data: T
}

export interface ITaskOptionBase {
  project: string
  miniAppId: string
  onProgressUpdate: <T>(message: ITaskProgressMessage<T>) => void
}

export interface IBuildTaskParams extends ITaskOptionBase {
  packageVersion?: string
}

interface IPreviewBuildOptions extends ITaskOptionBase {
  page?: string
  query?: string
  corpId?: string
  ignoreHttpReqPermission?: boolean
  ignoreWebViewDomainCheck?: boolean
  buildTarget: 'Preview' | 'RemoteLegacy' | 'RemoteX' | 'RemoteXLite' | 'RemoteBoatman' | 'Publish'
}

export interface MiniAppOpenSDK {
  /** 配置 */
  setConfig: (config: IOpenSDKConfig) => void

  /** 预览小程序 */
  previewBuild: (options: IPreviewBuildOptions) => Promise<string>

  /** 上传小程序 */
  miniUpload: (options: IBuildTaskParams) => Promise<{ packageVersion?: string }>
}
