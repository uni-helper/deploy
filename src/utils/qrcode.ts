import { Buffer } from 'node:buffer'

import { existsSync } from 'node:fs'
import { consola } from 'consola'
import { Jimp } from 'jimp'
import jsQR from 'jsqr'
import QRCode from 'qrcode'

/**
 * 读取二维码图片中的文本内容。
 *
 * 传入本地路径时直接读取文件，传入网络地址时先下载再解析。
 *
 * @param image 图片路径或网络地址
 */
export async function readQrcodeImageContent(image: string): Promise<string> {
  let input: Buffer | string = image

  if (!existsSync(image)) {
    const response = await fetch(image)
    if (!response.ok) {
      throw new Error(`下载二维码图片失败：${response.status} ${response.statusText}`)
    }
    input = Buffer.from(await response.arrayBuffer())
  }

  const parsed = await Jimp.read(input)
  const scanData = jsQR(
    new Uint8ClampedArray(parsed.bitmap.data),
    parsed.bitmap.width,
    parsed.bitmap.height,
  )

  if (!scanData) {
    throw new Error('扫描器 jsqr 未能识别出二维码内容')
  }

  return scanData.data
}

/**
 * 将文本内容转换成二维码输出在控制台上。
 */
export async function printQrcode2Terminal(content: string): Promise<void> {
  const terminal = await QRCode.toString(content, { type: 'terminal', small: true })
  consola.log(terminal)
}

/**
 * 生成二维码图片到指定路径。
 */
export async function generateQrcodeImageFile(path: string, content: string): Promise<void> {
  await QRCode.toFile(path, content, {
    errorCorrectionLevel: 'L',
    type: 'png',
  })
}
