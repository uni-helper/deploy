import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

const execFileAsync = promisify(execFile)

/**
 * 执行一个外部命令。
 *
 * 与 shell 字符串拼接不同，这里以数组形式传参，避免路径或密钥中的特殊字符被 shell 解释。
 */
export async function runCommand(command: string, args: string[] = []): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      maxBuffer: 1024 * 1024 * 32,
      windowsHide: true,
    })

    return { stdout, stderr, exitCode: 0 }
  }
  catch (error) {
    const err = error as NodeJS.ErrnoException & { stdout?: string, stderr?: string, code?: number | string }

    // 命令本身不存在
    if (err.code === 'ENOENT') {
      throw new Error(`命令不存在：${command}`, { cause: error })
    }

    // 非 0 退出码，交由调用方决定如何处理 stderr
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? err.message,
      exitCode: typeof err.code === 'number' ? err.code : 1,
    }
  }
}
