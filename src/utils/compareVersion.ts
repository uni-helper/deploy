/**
 * 比较两个语义化版本号。
 *
 * @returns `1` 表示 `v1 > v2`，`-1` 表示 `v1 < v2`，`0` 表示相等
 */
export function compareVersion(v1: string, v2: string): number {
  const parts1 = String(v1).split('.')
  const parts2 = String(v2).split('.')
  const len = Math.max(parts1.length, parts2.length)

  while (parts1.length < len) {
    parts1.push('0')
  }
  while (parts2.length < len) {
    parts2.push('0')
  }

  for (let i = 0; i < len; i++) {
    const num1 = Number.parseInt(parts1[i]!, 10)
    const num2 = Number.parseInt(parts2[i]!, 10)

    if (num1 > num2) {
      return 1
    }
    if (num1 < num2) {
      return -1
    }
  }

  return 0
}
