# 5 分钟配置 Gmail 登录

**普通家人不需要 Google Cloud，也不需要信用卡。**  
只有应用管理员需要用自己的 Gmail 做一次 OAuth Client ID 注册；注册完，家人点「使用 Google 账户登录」即可。

Google 的规则是：任何应用读取用户私人日历前，都要有一个「应用身份」（OAuth Client ID），用来展示同意屏幕。TimeTree、Cozi 等应用也是同一个模型，只是它们已经替用户注册好了。我们无法绕过这一步去直接读取 Gmail 日历，否则 Google 会拒绝。

---

## 一次性步骤（管理员）

### 1. 打开 Google Cloud Console

用任意 Gmail 登录：

- 新建项目：<https://console.cloud.google.com/projectcreate>
- 项目名随意，例如 `PeleMele`

不需要开通结算账号。

### 2. 启用 Google Calendar API

打开：

<https://console.cloud.google.com/apis/library/calendar-json.googleapis.com>

选择刚建的项目 → **启用**。

### 3. 配置 OAuth 同意屏幕

打开：

<https://console.cloud.google.com/apis/credentials/consent>

- User type：**External**
- App name：`PeleMele`
- 支持邮箱：你的 Gmail
- 保存后，在 **Test users** 里添加家人的 Gmail
  - 家庭自用，测试模式最多 100 个用户，够用
  - 以后要公开发布，再提交 Google 验证

### 4. 创建 OAuth Client ID

打开：

<https://console.cloud.google.com/apis/credentials>

1. **创建凭据 → OAuth 客户端 ID**
2. 应用类型：**Web application**
3. Authorized JavaScript origins 添加：
   - `http://localhost:5173`（本地开发）
   - `https://lulgabc.github.io`（线上）
4. 创建后复制 Client ID，形如：
   `1234567890-abc123.apps.googleusercontent.com`

### 5. 把 Client ID 交给 PeleMele

任选一种：

**A. 线上永久配置（推荐）**

GitHub 仓库 → Settings → Secrets and variables → Actions → **Variables** → New repository variable：

- Name：`GOOGLE_CLIENT_ID`
- Value：刚才复制的 Client ID

然后让 Pages 工作流重新运行（推一次提交，或 Actions → Deploy to GitHub Pages → Run workflow）。

**B. 直接粘贴**

打开线上 PeleMele → 设置 → Google 日历 → 「Google 登录配置」→ 粘贴 Client ID。  
这个值只保存本机。

**C. 本地开发**

复制 `.env.example` 为 `.env.local`：

```bash
VITE_GOOGLE_CLIENT_ID=你的client-id.apps.googleusercontent.com
```

---

## 家人怎么用

1. 打开 PeleMele → 设置 → Google 日历
2. 在「同步到哪位家长」选择自己
3. 点 **使用 Google 账户登录**
4. 选择自己的 Gmail，同意：
   - 查看姓名、邮箱、头像（显示登录状态）
   - 查看日历忙碌/空闲
5. 看到「已登录 xxx@gmail.com」即成功

另一位家长在同一台设备上切换成员后再登录即可；也可以各自在自己的手机上登录。

---

## 为什么不能「只输入 Gmail 密码」？

不可以。让第三方网页直接拿 Gmail 密码去读日历会带来严重安全问题，Google 也不会允许。OAuth 的正确模型是：

- 用户只在自己的 Google 页面输入密码；
- 应用拿到一张限权、限时的 access token；
- 应用只能读取用户同意的最小范围；
- 用户随时可以撤销。

PeleMele 只申请：

```text
openid email profile
https://www.googleapis.com/auth/calendar.freebusy
```

不读取事件标题、地点、参与者。token 只存在浏览器本次会话。

---

## 如果完全不想注册 OAuth Client ID

有几条替代路径，但都更麻烦或不安全，不推荐给家庭用户：

1. **Google 日历的 secret iCal 地址**：用户复制私有订阅链接，应用需要一台代理服务器去抓取；链接等于日历密码，泄露风险更高；而且会读到全部事件标题。
2. **自建 CalDAV / 应用专用密码**：同样需要服务器代理，且 Google 仍可能限制。
3. **第三方日历聚合服务**：不需要自己开 Google Cloud，但要注册服务商、配置 API key，通常收费，并把日历交给第三方。
4. **App 内嵌 Google 日历 iframe**：可以看到界面，但无法程序化读取空闲时间，不能满足「找共同空闲」。

所以对家庭自用，**最简单可靠的方式仍然是：管理员注册一次 OAuth Client ID，家人只用 Gmail 登录。**

---

## 常见问题

**需要信用卡吗？**  
不需要。OAuth Client ID 和 Calendar API 的基础使用免费。

**每个家人都要做这些吗？**  
不需要。只有管理员做一次；家人只需 Gmail 登录。

**测试模式会过期吗？**  
不会。Test users 长期可用；公开发布才需要 Google 验证。

**授权过期怎么办？**  
access token 约 1 小时。页面重新点「刷新忙碌时间」会重新授权；登录信息仍显示，token 不落盘。

**可以同时连爸爸妈妈吗？**  
可以。选择成员 → 登录自己的 Gmail；再切换成员 → 用另一个 Gmail 登录。两边忙碌区间按成员分别保存。
