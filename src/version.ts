/**
 * 包版本号。
 *
 * 由 tsdown 在构建时通过 `define` 注入，未注入时回退到开发期的占位值。
 */
declare const __VERSION__: string | undefined

export const version: string = typeof __VERSION__ === 'string' ? __VERSION__ : '0.0.0-dev'
