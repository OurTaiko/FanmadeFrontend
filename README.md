# OurTaiko Fanmade Web

React + TypeScript + Vite 前端，独立 Git 仓库。**仅使用 pnpm**，提交 `pnpm-lock.yaml`；包管理器版本记录在 package.json。Go / PostgreSQL 后端位于相邻的 `../backend` 独立仓库。

远端仓库：[OurTaiko/Fanmade_Frontend](https://github.com/OurTaiko/Fanmade_Frontend)，使用 `ourtaiko` 远端管理。

## 启动

环境：Node.js 22.12+（本机验证为 26.8）、pnpm 12.3.4。

```sh
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
- 投稿：文件选择或拖放、UTF-8 / Shift-JIS、本地 WAVE 匹配、元数据预览、上传进度、服务端校验反馈。
- 账号：用户名 / 密码注册登录、我的作品、删除和退出。
- 390px 移动端布局与桌面布局。

正式注册要求绑定验证邮箱，但本示范版按约定暂缓实现。可直接创建本地演示账号；不会把账号标记为邮箱已验证。

## ESE 参考文件

真实数据来自本机 `~/Documents/GitHub/ESE`，不是伪造 TJA。先启动后端，在后端仓库执行 `python3 scripts/demo.py seed` 可通过上传 API 导入 6 组演示谱面。源文件不会被修改或放进前端 Git。

核心规则在 `src/tja.ts`，共享测试样例为 `contracts/validation.json`，与后端副本保持相同。需要资源的 `#NEXTSONG` 多音频谱暂不接受。ESE 中 `Together.tja` 缺少一个 #START，已在参考库测试中记录，原文件不改写。

## 检查

```sh
pnpm lint
pnpm format:check
pnpm build
pnpm test
ESE_ROOT=~/Documents/GitHub/ESE pnpm test

# 先启动前后端并导入 ESE 示例；需要系统 Google Chrome：
pnpm test:e2e
```

浏览器测试创建临时账号和作品，测试结束后软删除作品。测试涵盖：错误 OGG 无上传请求、正确文件发布、下载原字节一致、音频就绪、删除后下载失效、退出、搜索、双人谱展示和移动端无横向溢出。

`pnpm preview` 只预览静态构建产物，不包含 API 代理。完整本地示范请使用 `pnpm dev`；生产部署需由反向代理把 `/api` 转发到 Go，并为 SPA 路由提供 index.html 回退。

## 代码布局

- `src/pages.tsx`：发现、账号、详情页面。
- `src/edit-metadata.tsx`：原生 dialog 编辑弹窗、局部保存、恢复原值与失败反馈。
- `src/upload.tsx`：文件快照、本地校验和上传状态。
- `src/tja.ts`：纯文本解析、资源名匹配。
- `src/api.ts`：API 类型、JSON 请求和 XHR 进度。
- `src/session-context.ts`、`src/session.tsx`：会话上下文与 Provider，分离以支持热更新。
- `src/components.tsx`、`src/styles.css`：公共界面与响应式样式。
- `e2e/upload.spec.ts`：Playwright 真实浏览器测试。
- `e2e/edit.spec.ts`：作者编辑、取消／焦点恢复、保存失败重试、移动端、恢复原值与权限入口测试。

编辑入口使用 Session 的 user.id / user.isAdmin 判断，最终权限由 Go API 独立校验。匿名或普通他人账号没有按钮；管理员角色只能由服务端配置，不能通过注册或 PATCH 声明。取消和 Escape 不保存，保存期间禁止关闭和重复提交，失败保留草稿；原始 TJA、谱面版本和成绩不受展示编辑影响。

本次验证：pnpm lint/build/format:check、29 个基础测试与编辑 Playwright 测试通过；agent-browser 检查桌面及 390px 弹窗，无横向溢出、错误遮罩或页面错误。管理员真实放行／撤权由后端 PostgreSQL 测试覆盖，浏览器管理员入口使用受控会话响应测试。

后台验证是最终依据。前端不把解析出的标题、难度或“验证通过”标记当作后端可信数据发送；上传原始文件后由后端重新解析。游戏、邮箱验证、替换版本、管理员页面和社交功能仍在后续计划。
