# PeleMele · 验收记录

日期：2026-11-19
环境：macOS / Node v22.22.3 / npm 11.17.0 / Xcode 27.2 / Capacitor 8.6.2

## Web

```bash
$ npx tsc --noEmit
# 无输出（通过）

$ npm test
Test Files  7 passed (7)
     Tests  37 passed (37)
  Duration  ~3s

$ npm run build
✓ 2459 modules transformed
dist/index.html                        1.08 kB
dist/assets/index-*.css               71.10 kB │ gzip: 14.08 kB
dist/assets/index-*.js               368.39 kB │ gzip: 114.78 kB
✓ built
```

测试覆盖：
- 区间合并 / 差集 / 交集
- 两位家长共同空闲、家庭活动占用、孩子活动不占用父母、最小时长、跨日
- 冲突检测
- reducer 新增/编辑/软删除/主题
- 同步合并（每成员 Google busy 取最新）
- 日期（周一起始、月纸带、全天跨日、off-by-one）
- 备份导入导出
- 组件：首屏、导航、快速添加、月视图日抽屉、贴纸抽屉预填并持久化所选贴纸
- 贴纸开关：Playwright 验证关闭后 tray/event stickers 数量为 0，打开后恢复
- Google freeBusy：请求头、时间范围、区间映射、401/无权限错误
- **同步服务端到端**：创建房间 → 推送修改 revision+1 → 第二台设备拉取并合并

## 截图巡检

Playwright（系统 Chrome，无头）遍历：

- Web 桌面 1440×900：今天 / 节奏 / 花园 / 合拍 / 设置 / 活动抽屉
- Web 移动 390×844：同上下 + 青柠 / 可可夜皮肤
- 贴纸：`sticker-tray-desktop.jpg`、`sticker-tray.jpg`、`mobile-stickers.jpg`
- 输出：`docs/screenshots/`（18 张）
- **Console / page errors：0**

## PWA

本地生产预览：

```bash
$ npm run preview -- --port 4183
$ BASE_URL=http://localhost:4183 node scripts/check-pwa.mjs
manifest/sw: {"manifestStatus":200,"appName":"PeleMele — 一家人的时间海报",
  "icons":4,"standalone":"standalone","swScope":"http://localhost:4183/","controlled":true}
offline app renders: true
console errors: none
```

子路径构建（模拟 GitHub Pages）：

```bash
$ VITE_BASE=/PeleMele/ npm run build
$ VITE_BASE=/PeleMele/ npx vite preview --port 4184
$ BASE_URL=http://localhost:4184/PeleMele node scripts/check-pwa.mjs
manifest/sw: {"manifestStatus":200,...,"swScope":"http://localhost:4184/PeleMele/","controlled":true}
offline app renders: true
```

## GitHub Pages

- 仓库：<https://github.com/lulgabc/PeleMele>
- 在线：<https://lulgabc.github.io/PeleMele/>
- 工作流：`.github/workflows/pages.yml`，最新运行 [44587991549](https://github.com/lulgabc/PeleMele/actions/runs/44587991549) **成功**（首次启用运行 44583188989）
- Pages Source：**GitHub Actions**，`build_type=workflow`
- 线上实测：`/PeleMele/`、`manifest.webmanifest`、`sw.js`、图标均 HTTP 200
- 线上 Playwright：标题正确、家庭内容可见、SW scope `/PeleMele/`、离线渲染成功、控制台 0 错误
- 线上贴纸：`.sticker-tray` 数量 1；点「露营」预填「周末露营」并自动选中 🏕️；控制台 0 错误

首次启用时 GitHub Actions 的 `GITHUB_TOKEN` 无法创建 Pages site；已用管理员 token 通过
`POST /repos/lulgabc/PeleMele/pages {"build_type":"workflow"}` 启用。之后每次推送到 `main` 自动部署。

## Google 日历

- 使用 Google Identity Services token model，scope 为 `https://www.googleapis.com/auth/calendar.freebusy`
- 只 POST `/calendar/v3/freeBusy`，只保存忙碌区间；token 存 `sessionStorage`
- 无 Client ID 时展示「示例忙碌」并明确标注；无需 Google 也能体验合拍
- 真实 Google 账号授权需要用户自备 OAuth Client ID（见 README），本机未持有凭据，因此未做线上账号实测

## 家庭同步服务

```bash
$ node server/index.mjs --port 8790 --data ./server/data-test
$ curl ... /health
{"ok":true,"service":"pelemele-sync","version":1}

PUT 创建   → HTTP 201  {"revision":1}
GET 读取   → HTTP 200  state 正确
PUT 旧版本 → HTTP 409  conflict + 当前 state
GET 错密钥 → HTTP 403  {"error":"bad_key"}
PUT 新版本 → HTTP 200  {"revision":2}
GET 再读   → HTTP 200  state=v2
```

密钥使用 scrypt 哈希 + `timingSafeEqual`；文件原子写、权限 0600。
客户端 `syncNow` 的端到端用例也在 `npm test` 中（真实 spawn 服务 + 两台设备合并）。

## iOS

```bash
$ npx cap add ios
✔ ios platform added!
$ npx cap sync
✔ Sync finished
$ xcodebuild -project ios/App/App.xcodeproj -scheme App \
    -sdk iphonesimulator -configuration Debug \
    -derivedDataPath /tmp/pelemele-xcode CODE_SIGNING_ALLOWED=NO build
** BUILD SUCCEEDED **
```

在 iPhone 17 模拟器安装并运行：

```bash
$ xcrun simctl install <device> /tmp/pelemele-xcode/Build/Products/Debug-iphonesimulator/App.app
$ xcrun simctl launch <device> com.pelemele.app
com.pelemele.app: 61249
```

截图：`docs/screenshots/ios-today.jpg`（真实 WKWebView，安全区已适配）。

## Android

```bash
$ npx cap add android
✔ android platform added!
$ npx cap sync android
✔ update android
```

工程与资源已生成（含品牌 launcher / adaptive icon / splash）。本机未安装 JDK 与 Android SDK，因此未执行 `assembleDebug`；安装 JDK 17+ 与 Android SDK 后运行：

```bash
cd android && ./gradlew assembleDebug
```

## 已知边界

1. Google OAuth 需要你提供 Client ID；线上授权未在本机验证。
2. 原生壳内暂未接系统浏览器 PKCE 的 Google 授权；Web 授权后的 busy 会通过家庭同步到达原生端。
3. 家庭同步是最终一致（打开 / 切回 / 编辑后 3.5s）而非实时协同。
4. 颜色派生依赖 `color-mix()`，建议 iOS 16.4+ / 现代 Chrome。
