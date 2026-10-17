import { consola } from 'consola'

/**
 * 日志工具。
 *
 * 基于 consola，CLI 与 SDK 共用同一实例，方便使用方统一控制日志级别。
 */
export const logger = consola.withTag('uni-deploy')

export { consola }
