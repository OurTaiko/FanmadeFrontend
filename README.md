# OurTaiko Fanmade Web

React + TypeScript + Vite 前端，独立 Git 仓库。**仅使用 pnpm**，提交 `pnpm-lock.yaml`；包管理器版本记录在 package.json。Go / PostgreSQL 后端位于相邻的 `../backend` 独立仓库。

远端仓库：[OurTaiko/Fanmade_Frontend](https://github.com/OurTaiko/Fanmade_Frontend)，使用 `ourtaiko` 远端管理。

生产服务器通过 Git 拉取本仓库及 TJARenderer 子模块，使用 pnpm 构建，1Panel OpenResty 提供静态文件和同域 `/api/`。服务器更新入口为 `bash /opt/ourtaiko-fanmade/src/frontend/deploy/publish.sh`，按 Git 版本保存构建并切换站点目录；不会启动 Vite 开发服务。后端仓库的 `docs/DEPLOYMENT.md` 记录完整部署路径。

## 启动

环境：Node.js 22.12+（本机验证为 26.8）、pnpm 12.3.4。

```sh
git submodule update --init --recursive
pnpm install --frozen-lockfile
pnpm dev
```

打开 `http://127.0.0.1:5173`。后端需先在 `http://127.0.0.1:8080` 启动；Vite 转发 `/api`，无需修改浏览器跨域配置。请使用 127.0.0.1，避免与 localhost 混用导致 Origin 或会话校验失败。

局域网真机测试可运行 `pnpm exec vite --host 0.0.0.0 --port 5173 --strictPort`，并使用 `http://<Mac 局域网 IP>:5173/register` 注册。后端进程需设置 `APP_ORIGIN=http://<Mac 局域网 IP>:5173` 后重启，否则注册、登录等写入请求会被来源校验拒绝；该配置仅接受一个网页来源，切回本机地址测试时也需同步调整。前端仍通过 Vite 代理连接本机后端。

`pnpm-workspace.yaml` 已明确允许 esbuild 与 agent-browser 的必要安装脚本。不要生成 package-lock.json 或 yarn.lock。

## 功能

- 发现谱面：真实 PostgreSQL 数据、关键词搜索、难度筛选和分页。
- 作品详情：多难度 / P1 / P2 展示、音频试听、原始 TJA 和 ZIP 下载。
- 编辑信息：作者和管理员在详情页打开弹窗，修改英文、日文、中文、韩文歌名／副标题，支持按语言恢复原值；保存后立即更新详情。
- 投稿：文件选择或拖放、自动识别编码并转换为 UTF-8、本地 WAVE 匹配、元数据预览、上传进度、服务端校验反馈。
- 账号：用户名 / 密码注册登录、我的作品、删除和退出。
- 歌曲详情：共享难度选择器，默认 Oni，缺失时依次回退 Edit、Hard、Normal、Easy。第一个 Tab 为交互谱面预览，第二个为当前难度排行榜。
- 谱面预览：从后端当前版本文件接口下载原始 TJA，按记录的 UTF-8 / Shift-JIS 解码；切换难度和 Tab 不重复下载。支持缩放、分支选择、Single / P1 / P2 切换、悬停和点击查看音符信息、两次点击选中区间。
- 排行榜：每位玩家显示当前版本单人谱的最高分、良／可／不可／连打，同分并列，每页 20 人。DOUBLE 不提供云端排行榜；歌曲更名不影响记录。
- 390px 移动端布局与桌面布局。

正式注册要求绑定验证邮箱，但本示范版按约定暂缓实现。可直接创建本地演示账号；不会把账号标记为邮箱已验证。

## ESE 参考文件

真实数据来自本机 `~/Documents/GitHub/ESE`，不是伪造 TJA。先启动后端，在后端仓库执行 `python3 scripts/demo.py seed` 可通过上传 API 导入 6 组演示谱面。源文件不会被修改或放进前端 Git。

核心规则在 `src/tja.ts`，共享测试样例为 `contracts/validation.json`，与后端副本保持相同。仅接受 Easy / Normal / Hard / Oni / Edit（TJA 数字 0–4），拒绝 Tower / Dan（含 5 / 6、大小写变体）；混合普通难度也整份拒绝。筛选、徽标和详情选择器只展示五种普通难度；如果 API 返回混合或不支持作品，隐藏卡片并阻止详情加载资源。需要资源的 `#NEXTSONG` 多音频谱暂不接受。ESE 中 `Together.tja` 缺少一个 #START，已在参考库测试中记录，原文件不改写。

## 检查

```sh
pnpm lint
pnpm format:check
pnpm build
pnpm test
ESE_ROOT=~/Documents/GitHub/ESE pnpm test

# 先启动前后端并导入 ESE 示例；需要系统 Google Chrome：
pnpm test:e2e

# 局域网详情页回归（使用已导入的 ESE 演示曲库）
PLAYWRIGHT_BASE_URL=http://<Mac-IP>:5173 pnpm exec playwright test e2e/detail.spec.ts
```

浏览器测试创建临时账号和作品，测试结束后软删除作品。测试涵盖：错误 OGG 无上传请求、正确文件发布、下载原字节一致、音频就绪、删除后下载失效、退出、搜索、双人谱展示和移动端无横向溢出。

`pnpm preview` 只预览静态构建产物，不包含 API 代理。完整本地示范请使用 `pnpm dev`；生产部署需由反向代理把 `/api` 转发到 Go，并为 SPA 路由提供 index.html 回退。

## 代码布局

- `src/pages.tsx`：发现、账号、详情页面。
- `src/edit-metadata.tsx`：原生 dialog 编辑弹窗、局部保存、恢复原值与失败反馈。
- `src/upload.tsx`：文件快照、本地校验和上传状态。
- `src/tja.ts`：纯文本解析、资源名匹配。
- `src/api.ts`：API 类型、JSON 请求和 XHR 进度。
- `src/chart-activity.tsx`：详情难度选择、TJA 请求和排行榜分页。
- `src/chart-preview.tsx`、`src/preview-tja.ts`：TJARenderer 交互画布及按谱面块分离的解析适配。
- `src/session-context.ts`、`src/session.tsx`：会话上下文与 Provider，分离以支持热更新。
- `src/components.tsx`、`src/styles.css`：公共界面与响应式样式。
- `e2e/upload.spec.ts`：Playwright 真实浏览器测试。
- `e2e/edit.spec.ts`：作者编辑、取消／焦点恢复、保存失败重试、移动端、恢复原值与权限入口测试。
- `e2e/detail.spec.ts`：真实 ESE 预览、默认难度、手机布局、DOUBLE、音符点击、分支、排行榜分页与失败重试。

## TJARenderer 依赖

`TJARenderer/` 为 [jack9966qk/TJARenderer](https://github.com/jack9966qk/TJARenderer) 的 Git submodule，固定版本由 Git 的 submodule 提交指针记录。克隆时使用 `git clone --recurse-submodules`，或执行上面的初始化命令；不在子模块内运行 npm，也不修改其源码。前端通过 Vite 编译其中的 TypeScript，无额外运行时包依赖；上游 MIT LICENSE 保留在子模块内。

交互方式参考 OurTaikoWiki 和 [TJAAnalyzer](https://github.com/jack9966qk/TJAAnalyzer)。为了支持选区高亮与复用已解析谱面，适配层使用 TJARenderer 的内部 ChartView API，因此升级 submodule 时需要重新运行预览测试。渲染模块独立懒加载，不进入首页主体包。预览用内存中的谱面块副本，原始 TJA 下载、后端校验和版本不受影响。

编辑入口使用 Session 的 user.id / user.isAdmin 判断，最终权限由 Go API 独立校验。匿名或普通他人账号没有按钮；管理员角色只能由服务端配置，不能通过注册或 PATCH 声明。取消和 Escape 不保存，保存期间禁止关闭和重复提交，失败保留草稿；原始 TJA、谱面版本和成绩不受展示编辑影响。

本次验证：pnpm lint/build/format:check、29 个基础测试与编辑 Playwright 测试通过；agent-browser 检查桌面及 390px 弹窗，无横向溢出、错误遮罩或页面错误。管理员真实放行／撤权由后端 PostgreSQL 测试覆盖，浏览器管理员入口使用受控会话响应测试。

后台验证是最终依据。前端不把解析出的标题、难度或“验证通过”标记当作后端可信数据发送；上传转换后的 UTF-8 文件后由后端重新解析。游戏、邮箱验证、替换版本、管理员页面和社交功能仍在后续计划。

## 邮箱验证注册

注册页面要求邮箱和 6 位验证码，未填完整验证码时禁用“验证并创建账号”。获取成功后显示重发倒计时；验证码错误、过期、锁定或邮件发送失败均展示后端提示。更换邮箱会清空验证码，登录页面仍只需要用户名和密码。

SMTP 配置放在后端 `.env`，前端不接触 SMTP 密码。后端自动加载 `.env`，发件人默认 `OurTaiko <no-reply@mail.ourtaiko.org>`。见后端 `docs/EMAIL_VERIFICATION.md`。

注册浏览器测试通过后端隔离夹具启动（先 `pnpm install` 并安装 Chrome）：

```sh
cd ../backend
FRONTEND_E2E=1 DATABASE_TEST_URL='postgres://localhost/ourtaiko_fanmade?host=/tmp&sslmode=disable' go test ./internal/httpapi -run TestRegistrationBrowser -v -count=1
```

夹具自动启动临时 API/Vite，使用独立数据库 schema 和测试收件箱，不向真实邮箱发信。需要创建账号的 E2E 用例在未配置测试收件箱时跳过，不能绕过邮箱验证。常规开发仍使用 `pnpm dev`；`VITE_API_TARGET` 可仅为隔离测试覆盖 Vite 的代理目标，默认后端为 `http://127.0.0.1:8080`。

难度限制的隔离浏览器测试只需启动前端，无需后端、数据库或邮件服务：

```sh
pnpm exec playwright test e2e/courses.spec.ts
```

该用例验证五种筛选、普通谱面预览、不支持作品不可见，以及 Tower/Dan/5/6 混合谱面在本地被拒绝且没有上传请求；替换为 Oni 后恢复发布按钮。

## MP3 上传

支持一个 TJA 搭配一个 OGG（Vorbis）或 MP3，音频上限 100 MiB。WAVE 必须与音频文件名完全对应；浏览器检查文件头，后端检查真实格式及完整解码。试听、下载和 ZIP 保留原始 MP3，不转码。`pnpm test` 包含 MP3 有／无 ID3、扩展名大小写、错误文件名与伪装文件头测试。

## 统一弹窗提示

操作错误、成功反馈、验证码发送结果、上传校验、未登录提醒、预览／排行榜错误统一使用弹窗，关闭后不在页面保留横幅。上传进度和删除确认也显示在弹窗中；上传规则和预览操作说明可通过按钮打开。表单标签、必要填写说明、加载状态和谱面／排行榜本身的数据仍保留。

`NotificationProvider` 负责提示队列，`Notice` 绑定已有状态并在来源卸载时移除过期提示；主动操作使用 `useNotification().notify()`，保证重复失败仍能再次提示。原生 dialog 提供模态焦点约束，支持确认按钮、关闭按钮及 Esc，上传处理期间需使用“取消上传”。

验证：`pnpm build`、`pnpm lint`、`pnpm test` 通过（71 项通过，1 项既有条件测试跳过）。Chrome 在隔离接口夹具下验证了错误弹窗、Esc 关闭、重复保存失败、编辑内容保留、保存成功、删除确认、MP3 文件不匹配／校验成功，以及关闭后继续填写不重复弹出。没有调用正式数据库或真实邮件接口。相关 E2E 断言已更新，并补充 `e2e/notifications.spec.ts`；本次未执行完整 Playwright 套件。

## TJA 自动编码转换

上传页无需选择编码。浏览器优先严格识别 UTF-8 与 Unicode BOM，支持 UTF-16、带 BOM 的 UTF-32，并对 Shift-JIS、GB18030、Big5、EUC-JP、EUC-KR 等常见编码结合文本识别结果与 WAVE 文件名判断。编码识别存在歧义时拒绝继续，并弹窗提示另存为 UTF-8，避免默默替换损坏字符。

识别成功后在内存中生成无 BOM 的 UTF-8 文件，再校验 TJA 与音频文件名；提交的 multipart 使用转换后的文件和 `encoding=utf-8`。本机原文件、文件名、谱面内容和换行不变，仅上传副本转换编码。原文件和转换后的文件都必须满足 2 MiB 上限。识别结果与失败原因均通过弹窗显示。

后端独立验证文件并统一保存 UTF-8，按保存后的字节计算 SHA-256 和大小；下载得到相同的 UTF-8 内容。已有作品不自动改写。自动检测实现位于 `src/tja-encoding.ts`，统计检测器仅在非 UTF-8 文件需要时加载。

验证覆盖多语言旧编码、Unicode BOM、损坏字符、WAVE 不匹配、转码后超限，以及浏览器实际提交的 UTF-8 multipart 内容；后端集成测试验证入库编码、哈希、大小、单文件下载、ZIP 与幂等重试。

## 谱面分类

上传页及谱面信息编辑弹窗从 `GET /api/v1/categories` 读取多选项；上传未选择时默认 Variety。信息编辑回显 `Chart.categoryIds`，仅分类改变时发送该字段；清空后由后端归入 Variety。分类变更保留谱面版本和成绩。需配套支持分类的后端；分类加载失败可原地重试。

`e2e/categories.spec.ts` 覆盖真实 API 上传、默认值、加载失败重试、作者分类编辑、刷新回显与手机弹窗。测试需要隔离 API 及 `FANMADE_TEST_MAILBOX`，或 `FANMADE_CATEGORY_TEST_USER` / `FANMADE_CATEGORY_TEST_PASSWORD` 测试账号；使用 `PLAYWRIGHT_BASE_URL` 指向测试前端。

## 难度制作者

上传校验后显示各谱面块的「难度与制作者」表格，默认使用 TJA 的 MAKER，支持单独修改与清空；提交为按 blockIndex 对应的 difficultyMakers。预览汇总署名以 ` | ` 去重连接。详情页保留歌曲总署名，并在难度选择器下显示选中难度的署名；同难度多块按 P1/P2 分列。

验证：`pnpm test`、`pnpm build`、`pnpm lint`；运行本地前后端后，`pnpm exec playwright test e2e/makers.spec.ts` 检查默认填值、修改后提交、切换难度及 390px 手机布局。该用例拦截上传响应，不发布真实作品。
