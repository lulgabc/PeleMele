# PeleMele · 研究与选型

> 目标：给 3 口或多孩家庭做一个轻量、跨平台（iOS / Android / Web）的共享日历。
> 核心场景：周末活动、假日旅行、日常聚会、生日；同步父母的 Google 日历，找共同空闲。
> 明确约束：界面不能是 Google Calendar 式表格；配色温馨、活泼、大胆；皮肤可定制。

调研时间：2026-11。以下结论只服务于本项目的取舍，不是通用评测。

---

## 1. 先看今天的产品，找空位

| 产品 | 强项 | 明显短板 / 我们的机会 |
| --- | --- | --- |
| Google Calendar | 同步能力、所有人都在用 | 信息密度高、表格化；家庭日程和父母工作日程混在一起；对“全家什么时候都有空”没有直接回答 |
| TimeTree | 事件内聊天、家庭共享、免费 | 多日历后容易杂乱；视觉偏工具；广告；仍是月网格 |
| Cozi | 清单 + 餐食 + 日历，家庭场景完整 | 界面陈旧；免费版限制；月视图在移动端被锁在付费层 |
| FamilyWall | 家庭消息、位置、待办 | 功能重，日历只是模块之一；高级同步收费 |
| Skylight / Hearth | 厨房大屏，一眼可见 | 硬件昂贵 + 订阅；移动端体验不是重点 |
| Calendara / Sense | AI 从邮件/照片导入日程 | 偏“录入自动化”，不是“共享时间的美感与共识” |

**空位**：大多数家庭日历都在解决“记得住”，很少解决“看得懂、愿意一起看、看完能立刻定下来”。
我们把产品定位成：

> 一块全家人愿意每天瞄一眼的“时间海报”，而不是一张缩小版 Excel。
> 差异点 = **共同空闲优先** + **非网格的叙事化视图** + **可换肤的强视觉**。

家庭规模假设：2 位家长 + 1–3 个孩子。最高频动作：看今天、看周末、找全家空档、加一个活动、改时间。

---

## 2. 跨平台路线比较

候选：Capacitor（Web 套壳 + PWA）、React Native / Expo、Flutter、纯 PWA。

| 维度 | Capacitor 8 + React + Vite | Expo / React Native | Flutter | 纯 PWA |
| --- | --- | --- | --- | --- |
| 代码复用 | 100%（同一份 Web UI） | 逻辑与 UI 都可复用，但 Web 走 RN Web | 逻辑与 UI 复用，Dart | 100% |
| Web 体验 | 原生 Web，最佳 | RN Web 可用但有差异 | Web 端体积大、交互略异 | 原生 Web |
| 原生上架 | Xcode / Android Studio 包壳，可行 | EAS 最顺 | 原生编译，可行 | 不能上架 |
| 安装包体积 | 最小（壳 + Web bundle） | 中 | 中 | N/A |
| 设计自由度 | 完全 CSS/SVG，最适合“海报感”视觉 | 样式受 RN 约束，复杂视觉成本高 | 极高，但需 Dart 生态 | 完全 |
| 性能 | 对表单/日历足够；复杂手势一般 | 更高中上限 | 最高 | 同 Web |
| Google OAuth | Web 端 GIS 直接可用；原生需系统浏览器 + 深链 | 原生 PKCE 成熟 | 原生成熟 | 浏览器可用 |
| 本项目适配 | ★★★★★ | ★★★☆ | ★★★ | ★★（不能上架） |

**决定：Vite + React 19 + TypeScript，Web 优先；用 Capacitor 8 生成 iOS / Android 原生壳。**

理由：
1. 这个产品的胜负手是视觉与信息编排，CSS/SVG 是最短路径；RN 的自绘成本更高。
2. “轻量”是目标：同一份产物同时服务 Web/PWA 和原生壳，包体最小，迭代最快。
3. 家庭日历是典型的低帧率、表单型应用，WebView 性能完全够用；不需要 Flutter 的渲染上限。
4. Capacitor 8 支持 iOS 15+ / Android 7+（[官方文档](https://capacitorjs.com/docs)），覆盖足够。
5. Google 日历在 Web/PWA 上可通过 Google Identity Services 的 token 模型直接读取 free/busy（[GIS token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)），无需自建后端。
6. 纯 PWA 在 iOS 仍不能上架、无自动安装提示，通知依赖“添加到主屏幕”（[2026 iOS PWA 现状](https://www.mobiloud.com/blog/progressive-web-apps-ios/)）。所以保留 PWA，同时用原生壳解决分发与后续通知能力。

**风险与对策**
- WebView 上的 Google OAuth：iOS/Android 的内嵌 WebView 会被 Google 拦截。方案：Web/PWA 用 GIS；原生壳走系统浏览器 + PKCE 深链回调，token 交换用 Capacitor 原生 HTTP；本期先交付 Web/PWA 的完整 Google 同步，原生 OAuth 适配层预留接口与说明。
- iOS 存储可能被清理：提供 JSON 导出/导入 + 可选家庭同步服务；数据不锁定在单机。
- WebView 动画性能：只用 transform/opacity 做动效，尊重 `prefers-reduced-motion`。

---

## 3. Google 日历：只读、只取忙碌，不碰标题

- 权限：`https://www.googleapis.com/auth/calendar.freebusy`（最小权限；不需要读取事件内容）。
- 接口：`POST https://www.googleapis.com/calendar/v3/freeBusy`，一次请求可查询多本日历（[官方参考](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query)）。
- 流程（Web）：用户填入自己的 OAuth Client ID → GIS `initTokenClient` 弹窗授权 → 拿到 1 小时 access token → 查询未来 21 天 → 只把 `busy: [{start,end}]` 写入本地/家庭同步数据。
- Token 只放 `sessionStorage`，不落盘、不上传；不上传事件标题、地点、参与者。
- 每位家长用自己的账号、自己的设备授权；busy 以成员为粒度合并，因此“爸爸在手机 A 授权、妈妈在手机 B 授权”后，两端都能看到双方空档。
- 公开上架时 Google 敏感权限需要验证；自用/测试模式把家人加入 Test users 即可。
- 未配置时提供**明确标注的示例忙碌数据**，让“合拍”体验可被立即看到；一键关闭。

**为什么不用 ICS 订阅**：Google 的 secret iCal 地址在浏览器里没有 CORS，Web 端取不到；OAuth freeBusy 更干净、更小、更适合“只看空不看我干嘛”的隐私模型。

---

## 4. “家庭共享”怎么落地

三层，从轻到重：

1. **本机优先**：默认一切数据在 localStorage，离线可用，无账号、无注册。
2. **导出/导入**：`pelemele.json` 快照，可 AirDrop、微信、邮件传给家人。
3. **可选家庭同步服务**：仓库自带一个零依赖 Node 服务（`server/`），家庭自部署。家庭码 + 密钥，按实体 `updatedAt` 合并，墓碑删除；只同步日历数据，不同步 Google token。这样“轻量”不等于“单机玩具”。

同步协议刻意保持简单：
`GET/PUT /api/rooms/:room`，`baseRevision` 冲突检测，客户端拉取后按实体合并再推送。自部署即可，不绑定云厂商。

---

## 5. 视觉方向：从“日历”变成“家庭海报”

现有产品几乎都在用“线框 + 小色块 + 网格”。我们反着来：

- **底色**：暖奶油纸感（不是纯白），叠低饱和的珊瑚/薄荷/淡紫光晕和纸纹颗粒。
- **形体**：大圆角、贴纸、手绘虚线、略微旋转的卡片、印章式标签；拒绝 1px 灰线表格。
- **大字**：Fredoka（数字/拉丁）+ 系统中文字体 800 字重；日期是版面主角。
- **色彩**：每个皮肤 5 个色角色（背景 / 纸面 / 主色 / 副色 / 点缀），大胆但只用大面积暖色，深色文字保证对比度。
- **动效**：果冻感 hover、卡片入场 12ms stagger、保存时的小纸屑；全部可被减少动效偏好关闭。
- **信息层级**：一屏只回答一个问题——“今天干什么 / 这周什么节奏 / 哪天有空 / 全家什么时候合拍”。

**五个皮肤**
1. 蜜桃汽水（默认）：奶油 + 珊瑚 + 杏黄 + 薄荷。
2. 青柠野餐：米白 + 荧光青柠 + 森林绿 + 番茄红。
3. 泡泡糖：奶粉 + 洋红 + 葡萄紫 + 湖蓝。
4. 海盐日落：深海蓝底 + 珊瑚 + 金色 + 湖绿（大胆深色）。
5. 可可夜：深可可底 + 杏色 + 薄荷 + 樱粉（夜间暖色）。
另提供“自己调”：主色、点缀色、底色三个取色器，实时预览，自动派生整套 CSS 变量。

---

## 6. 信息架构与“反表格”视图

四个主入口（移动端底部浮动 Dock，桌面端顶栏）：

1. **今天**：问候 + 下一个大事件 + 今天的时间线 + 最近的合拍空档。
2. **节奏（周）**：一条 7 天的“波浪”选择器（不是列）；选中的一天展开为纵向故事线，事件卡片左右错落。周切换、今天回到当前。
3. **花园（月）**：每周是一条“纸带”，7 个日期泡泡由虚线连起来，事件以小标签落在当天下方；点日期打开当天抽屉。不是 7×5 网格。
4. **合拍**：紧凑成员/时段设置 → 3 个“最值得约”建议 → 未来 7 天的可用缎带：忙碌段是斜纹软块，共同空闲是高亮胶囊。

设置从右上角头像进入：皮肤、家庭成员、Google 日历、家庭同步、数据导入导出。

**添加活动**：底部抽屉，类型用 6 个大 Emoji 贴纸选择（旅行 / 聚会 / 生日 / 周末 / 日常 / 其他），只填标题 + 时间即可保存；参与者默认全家。保存前做冲突检测，温和提示“和『游泳课』重叠 30 分钟”，可仍然安排。

---

## 7. 可用性算法（可测试的核心）

1. 每位选中成员：在每天的可规划窗口（默认 08:00–22:00，可切换“仅晚上”）内，扣掉 Google busy 和与其相关的家庭活动。
2. 合并所有成员的忙碌区间（merge），再对“每日窗口”做差集（subtract），得到每人的空闲集合。
3. 对所有选中成员求交集；切成 ≥ 最小粒度（默认 90 分钟）的连续段。
4. 排序：周末优先 → 时长更长 → 时间更早；取前 3 作为“最佳合拍”。
5. 所有区间计算用半开区间 `[start, end)`，纯函数、不依赖 UI，单元测试覆盖。

家庭活动默认对所有参与者占用时间；只要活动涉及任一选中成员，就算全家被占用（避免“爸爸带孩子去游泳，妈妈被判定有空”的错误建议）。Google busy 永远只属于对应成员。

---

## 8. 参考来源

- Capacitor 官方文档（跨平台 Web Native、iOS 15+/Android 7+）：https://capacitorjs.com/docs
- Expo 对跨平台路线的说明与取舍：https://expo.dev/articles/choosing-a-mobile-stack/cross-platform-mobile-development
- Google Calendar freeBusy API：https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
- Google Identity Services token model：https://developers.google.com/identity/oauth2/web/guides/use-token-model
- iOS PWA 2026 能力与限制（安装、推送、存储）：https://www.mobiloud.com/blog/progressive-web-apps-ios/
- 家庭日历市场与竞品（TimeTree / Cozi / FamilyWall / Skylight）：https://www.folk.com/blog/best-shared-family-calendar-apps-compared
- 2026 家庭日历价格与形态补充：https://www.usecalendara.com/blog/family-calendar-app-pricing-2026

---

## 9. 验收清单

- [x] Web 端移动/桌面均可流畅使用，可安装为 PWA（manifest + service worker）。
- [x] iOS/Android Capacitor 工程已生成并 `cap sync` 通过；iOS 模拟器 `xcodebuild` 构建成功并运行。Android 构建需 JDK/Android SDK（本机未装）。
- [x] 活动增删改、成员管理、五种皮肤 + 自定义配色。
- [x] 今天 / 周 / 月 / 合拍四个视图均不是表格化日历。
- [x] 共同空闲计算有单元测试；冲突提示可用（6 文件 / 30 测试）。
- [x] Google 日历 free/busy 连接流程已实现；无凭据时有明确标注的示例模式。真实账号授权待用户 Client ID 验证。
- [x] 数据导出/导入；可选自部署同步服务已用 curl 与客户端端到端测试验证。
- [x] 视觉在 390px 手机与 1440px 桌面均有截图验收，iOS 模拟器截图见 `docs/screenshots/ios-today.jpg`。
- [x] 贴纸玩法：活动贴纸选择、模切白边/旋转/抬升 hover、可关闭开关；不增加首页独立版块。
