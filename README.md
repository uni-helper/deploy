<a href="https://uni-helper.js.org/deploy"><img src="./banner.svg" alt="banner" width="100%"/></a>

# @uni-helper/deploy

<div style="display: flex; justify-content: center; align-items: center; gap: 8px;">
  <a href="https://github.com/uni-helper/deploy/stargazers"><img src="https://img.shields.io/github/stars/uni-helper/deploy?colorA=005947&colorB=eee&style=for-the-badge" alt="GitHub stars"></a>
  <a href="https://www.npmjs.com/package/@uni-helper/deploy"><img src="https://img.shields.io/npm/dm/@uni-helper/deploy?colorA=005947&colorB=eee&style=for-the-badge" alt="npm downloads"></a>
  <a href="https://www.npmjs.com/package/@uni-helper/deploy"><img src="https://img.shields.io/npm/v/@uni-helper/deploy?colorA=005947&colorB=eee&style=for-the-badge" alt="npm version"></a>
</div>

<div style="display: flex; justify-content: center; align-items: center; gap: 8px;">
  <a href="https://deepwiki.com/uni-helper/deploy"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</div>

uni-app 小程序构建产物自动化部署工具。支持在构建完成后自动打开小程序开发者工具、上传代码作为体验版、生成预览二维码。

支持平台：微信小程序、支付宝小程序、字节跳动（抖音）小程序、百度小程序、京东小程序、钉钉小程序。

- 同时提供 **CLI** 与 **SDK** 两种调用方式

> **请考虑持续[赞助](https://afdian.com/a/flippedround)以维持该项目的持续健康发展，非常感谢！🙏**

## 安装

> 需要 Node.js >= 20.19.0（`cac` 依赖 `CustomEvent` 等较新的运行时 API）。

```sh
# npm
npm install @uni-helper/deploy -D

# pnpm
pnpm install @uni-helper/deploy -D

# yarn
yarn add @uni-helper/deploy -D
```

各平台的官方 CI 依赖体积较大且并非必装，因此被列为可选的 `peerDependencies`，请按需安装：

| 平台 | 需要安装的依赖 |
| --- | --- |
| 微信小程序 | `miniprogram-ci` |
| 支付宝小程序 | `minidev` |
| 字节跳动小程序 | `tt-ide-cli` |
| 百度小程序 | `swan-toolkit` |
| 京东小程序 | `jd-miniprogram-ci` |
| 钉钉小程序 | `dingtalk-miniapp-opensdk` |

```sh
pnpm install miniprogram-ci -D
```

未安装对应依赖时，命令会给出明确的安装提示并以非 `0` 退出码结束，不会中断整个进程。

## 配置文件

配置文件为项目根目录下的 `unh.config.ts`（也支持 `.mts` / `.cts` / `.js` / `.mjs` / `.cjs`），借助 [unconfig](https://github.com/antfu-collective/unconfig) 读取。

本工具的全部配置都写在 **`deploy` 字段**下。`unh.config.ts` 是与 [@uni-helper/unh](https://uni-helper.js.org/unh) 共用的文件，这样既不会和其它工具的同名字段冲突，也方便后续继续增加新的配置项：

```ts
import { defineConfig } from '@uni-helper/deploy'

export default defineConfig({
  deploy: {
    // 版本号，默认取 manifest.json 的 versionName，其次取 package.json 的 version
    'version': '1.0.0',
    // 版本描述
    'desc': '本次发布内容',

    // 微信小程序
    'mp-weixin': {
      appid: '微信小程序 appid',
      privateKeyPath: 'key/private.appid.key',
    },
    // 支付宝小程序
    'mp-alipay': {
      appid: '支付宝小程序 appid',
      toolId: '工具 id',
      privateKeyPath: 'key/pkcs8-private-pem',
    },
    // 字节跳动小程序
    'mp-toutiao': {
      email: '字节小程序邮箱',
      password: '字节小程序密码',
    },
    // 百度小程序
    'mp-baidu': {
      token: '鉴权需要的 token 令牌',
    },
    // 京东小程序
    'mp-jd': {
      privateKey: '京东小程序秘钥',
    },
    // 钉钉小程序
    'mp-dingtalk': {
      appid: '钉钉开放平台后台应用管理的 MiniAppId',
      token: '令牌，从钉钉后台获取',
    },
  },
})
```

`unh.config.ts` 中 `deploy` 之外的字段不会被本工具读取，因此可以和 unh 的配置共存：

```ts
import { defineConfig } from '@uni-helper/deploy'

export default defineConfig({
  // @uni-helper/unh 的配置，本工具不会读取
  platform: { default: 'mp-weixin' },

  // 本工具的配置
  deploy: {
    'mp-weixin': { appid: 'wx1234567890' },
  },
})
```

所有配置都必须写在 `deploy` 字段下，写在其它位置或其它字段都不会被读取。

### 配置优先级

从低到高依次为：

1. 内置默认值
2. `.env` 中的环境变量
3. `unh.config.ts` 中 `deploy` 字段下的配置
4. 调用时传入的内联配置

### 环境变量

私钥等敏感信息建议通过 `.env` 提供，避免提交到版本库：

```ini
MP_WEIXIN_APPID=
MP_WEIXIN_PRIVATE_KEY=
MP_WEIXIN_PRIVATE_KEY_PATH=

MP_ALIPAY_APPID=
MP_ALIPAY_PRIVATE_KEY=
MP_ALIPAY_PRIVATE_KEY_PATH=
MP_ALIPAY_TOOL_ID=

MP_TOUTIAO_EMAIL=
MP_TOUTIAO_PASSWORD=

MP_BAIDU_TOKEN=

MP_JD_PRIVATE_KEY=

MP_DINGTALK_APPID=
MP_DINGTALK_TOKEN=
```

### 项目产物目录

默认按 uni-app 的约定自动查找，无需手动配置：

```
dist/build/<platform>
dist/dev/<platform>
dist/<platform>
```

也可以在全局或平台级别显式指定：

```ts
import { defineConfig } from '@uni-helper/deploy'

export default defineConfig({
  deploy: {
    // 全局生效
    'projectPath': 'dist/build/mp-weixin',
    'mp-weixin': {
      appid: 'wx1234567890',
      // 平台级配置优先于全局配置
      projectPath: 'dist/build/mp-weixin',
    },
  },
})
```

### 版本号与描述

`version` 默认依次读取 `manifest.json` 的 `versionName`、`package.json` 的 `version`；`desc` 默认为构建时间。两者都可以在配置文件或单个平台中覆盖。

## CLI

安装后可直接使用 `uni-deploy`（简写 `und`）命令。

### 上传体验版

```sh
# 上传所有已配置的平台
uni-deploy upload

# 上传指定平台，多个平台用逗号分隔
uni-deploy upload --platform mp-weixin,mp-alipay

# 平台级命令写法，等价于 --platform <platform>
uni-deploy upload:mp-weixin
```

> 平台名一律使用标准名（`mp-weixin` 等），不支持 `weapp`、`alipay` 一类的别名。

### 生成预览二维码

```sh
uni-deploy preview --platform mp-weixin
```

### 打开开发者工具

```sh
uni-deploy open --platform mp-weixin
```

### 其它命令

```sh
# 查看解析后的配置，便于排查问题
uni-deploy config

# 查看支持的平台
uni-deploy platforms
```

### 命令参数

| 参数 | 说明 |
| --- | --- |
| `-p, --platform <platform>` | 目标平台，多个用逗号分隔，未指定时取所有已配置的平台 |
| `--cwd <dir>` | 工作目录，默认为当前目录 |
| `--config <path>` | 自定义配置文件路径，传 `false` 表示不读取配置文件 |
| `--app-version <version>` | 版本号，覆盖配置文件中的 `version` |
| `--desc <desc>` | 版本描述，覆盖配置文件中的 `desc` |
| `--projectPath <path>` | 构建产物目录，覆盖配置文件中的 `projectPath` |

> [!NOTE]
> `--app-version` 是小程序的版本号。查看 CLI 自身版本请用 `-v` / `--version`。

## SDK

```ts
import { deploy, open, preview, upload } from '@uni-helper/deploy'

// 上传体验版
const results = await upload({ platform: 'mp-weixin' })

// 生成预览二维码
await preview({ platform: ['mp-weixin', 'mp-alipay'] })

// 打开开发者工具
await open({ platform: 'mp-weixin' })

// 通用写法
await deploy({ action: 'upload', platform: 'mp-weixin' })
```

### 生命周期回调

```ts
import { upload } from '@uni-helper/deploy'

await upload({
  platform: 'mp-weixin',
  onUploadComplete(result) {
    console.log(result.success, result.qrCodeLocalPath)
  },
  onPreviewComplete(result) {
    console.log(result.qrCodeContent)
  },
})
```

### 内联配置

无需配置文件即可使用：

```ts
import { upload } from '@uni-helper/deploy'

await upload({
  platform: 'mp-weixin',
  config: {
    'mp-weixin': {
      appid: 'wx1234567890',
      privateKey: process.env.MP_WEIXIN_PRIVATE_KEY,
    },
  },
})
```

### 单独使用某个平台

```ts
import { createCI, loadConfig } from '@uni-helper/deploy'

const config = await loadConfig()
const ci = createCI('mp-weixin', config)

await ci.init()
await ci.upload()
```

### 返回值

`deploy`、`upload`、`preview`、`open` 返回 `DeployResult[]`：

```ts
interface DeployResult {
  platform: Platform
  action: 'open' | 'preview' | 'upload'
  success: boolean
  version: string
  desc: string
  projectPath: string
  /** 二维码内容，未能获取时为空字符串 */
  qrCodeContent: string
  /** 二维码图片的本地路径，未能生成时为空字符串 */
  qrCodeLocalPath: string
  error?: Error
}
```

失败时**不会抛出异常**，而是返回 `success: false` 的结果，便于在 CI 中一次性收集所有平台的结果：

```ts
import { upload } from '@uni-helper/deploy'

const results = await upload()
const failed = results.filter(result => !result.success)

if (failed.length) {
  process.exitCode = 1
}
```

平台不合法、找不到平台配置等**参数错误**仍会抛出异常。

## CI 示例

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install
      - run: pnpm build

      - run: pnpm uni-deploy upload --platform mp-weixin
        env:
          MP_WEIXIN_PRIVATE_KEY: ${{ secrets.MP_WEIXIN_PRIVATE_KEY }}
```

## 各平台说明

### 微信小程序

```ts
interface MpWeixinConfig {
  appid: string
  /** 与 privateKey 二选一 */
  privateKeyPath?: string
  /** 与 privateKeyPath 二选一 */
  privateKey?: string
  /** 微信开发者工具安装路径 */
  devToolsInstallPath?: string
  /** 项目类型，默认为 miniProgram */
  type?: 'miniProgram' | 'miniGame' | 'miniProgramPlugin' | 'miniGamePlugin'
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
```

使用 `open` 前需要先开启开发者工具的服务端口：**设置 → 安全设置 → 服务端口**。详见 [官方文档](https://developers.weixin.qq.com/miniprogram/dev/devtools/cli.html)。

### 支付宝小程序

```ts
interface MpAlipayConfig {
  appid: string
  toolId: string
  /** 与 privateKey 二选一 */
  privateKeyPath?: string
  /** 与 privateKeyPath 二选一 */
  privateKey?: string
  /** 上传的终端，默认为 alipay */
  clientType?: AlipayClientType
  /** 上传时想要删除的一个版本 */
  deleteVersion?: string
  /** 上传成功后是否自动设置为体验版本 */
  experience?: boolean
}
```

注意：支付宝 SDK 上传不支持设置描述信息，且上传的版本号必须大于线上最新版本号，否则会报错。详见 [官方文档](https://opendocs.alipay.com/mini/miniu/api)。

### 字节跳动小程序

```ts
interface MpToutiaoConfig {
  email: string
  password: string
  setting?: {
    /** 跳过域名检查 */
    skipDomainCheck?: boolean
  }
}
```

### 百度小程序

```ts
interface MpBaiduConfig {
  token: string
  /** 最低基础库版本，默认为 3.350.6 */
  minSwanVersion?: string
}
```

### 京东小程序

```ts
interface MpJdConfig {
  privateKey: string
  /** 指定使用哪一个 ci 机器人，可选值：1 ~ 30 */
  robot?: number
  /** 指定需要排除的规则 */
  ignores?: string[]
}
```

京东小程序不支持 `open` 动作。

### 钉钉小程序

```ts
interface MpDingtalkConfig {
  appid: string
  token: string
  /** 默认为 dingtalk-biz（企业内部应用） */
  projectType?: DingtalkProjectType
}
```

钉钉与支付宝小程序共用开发者工具，因此 `open` 动作需要安装 `minidev`。

## 开发

```sh
# 安装依赖
pnpm install

# 构建
pnpm build

# 监听模式
pnpm dev

# 代码检查
pnpm lint
pnpm lint:fix

# 类型检查
pnpm typecheck

# 测试
pnpm test
```

发布新版本：

```sh
pnpm release
```

该命令会通过 [bumpp](https://github.com/antfu-collective/bumpp) 更新版本号并打 tag，推送 tag 后由 GitHub Actions 自动发布到 npm。

## 参与贡献

欢迎提交 PR！请先确认 `pnpm lint`、`pnpm typecheck` 与 `pnpm test` 均通过。

## 许可

[MIT](./LICENSE)
