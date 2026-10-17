// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  pnpm: true,
  ignores: ['dist'],
  rules: {
    // 本仓库自行决定 workspace 配置，交由 pnpm 自身校验
    'pnpm/yaml-enforce-settings': 'off',
  },
})
