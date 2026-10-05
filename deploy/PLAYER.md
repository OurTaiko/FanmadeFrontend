# 谱面预览播放器

源项目：https://github.com/OurTaiko/OurTaikoView_Web 。前端直接提交 `public/player/<内容哈希>/` 构建产物，`.unityweb` 文件由 Git LFS 管理。

- 克隆后运行 `git lfs install` 和 `git lfs pull`。CI checkout 已启用 lfs，服务器 publish.sh 也会拉取对象；服务器需要安装 git-lfs。
- `player-build.json` 固定同源入口及各文件 SHA-256；`pnpm build` 校验产物，LFS 指针或损坏文件会明确失败。
- 更新时先构建 Unity，再运行其 `scripts/install-player.sh`，在前端一起提交新的哈希目录和 player-build.json。旧版本保留在 Git 历史及服务器 release 中。
- 不再从 Release 下载，不依赖相邻 Unity 项目才能构建前端。可通过 VITE_PLAYER_URL 覆盖为独立部署地址。
- Gzip + decompression fallback 的 unityweb 产物无需新增压缩响应头；每次构建使用不同目录以隔离缓存。
- 练习、观看不上传成绩；回放尚未实现。
