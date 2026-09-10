# emya

> 无惧扫库的新一代 `emby` 服务端

基于 [`nestjs`](https://nestjs.com/) 实现了 [`emby`](https://emby.media/) [
`API`](https://dev.emby.media/reference/RestAPI.html) 的相关接口

# 授权协议

基于 `MIT` 协议发布

如果您属于公益 或 个人 则无须购买授权

不过建议你在此 [issue](https://github.com/emosp/emya/issues/1) 中提一下你使用了本项目 让我做梦也能笑醒

其余情况则需要购买授权使用

基于品牌永久授权 价格为 `111.11` 元

点击查看已购买和赞助列表

# 兼容情况

> 因为官方客户端会调用 `websocket` 适配难度递增 故不支持官方客户端

因各软件接口调用的五花八门 目前优先实现通用接口

如需适配 麻烦给我一个带有debug日志版本的安装包 发送至我邮箱 我将尽快适配

# 安全须知

大多数软件请求 `/emby/Items/[emby_item_id]/PlaybackInfo` 地址获取播放信息

再拼接 `域名` 和 响应中的 `DirectStreamUrl` 组成播放地址 通常是这样的 `https://[host]/videos/[uuid]/original.strm`

系统会在 `video_media` 表中通过 `uuid` 找到对应的 `path_type` 与 `path_url` 字段

并且根据 `path_type` 地址类型字段 `302` 跳转到 `path_url`

目前只支持了 `url` 模式 所以对外提供服务时需要单独做鉴权处理

# 使用方式

这是 `emby` 的 `api` 实现

前期建议直接读写 `mysql` 进行资源入库

也可以看下 [API](./api.md) 文档

复制 `.env.example` 为 `.env` 并修改里面数据库等连接信息

```bash
pnpm install
# 迁移数据库
pnpm run db:migrate
# 导入测试数据 可选
pnpm run cli:dev import-test-data
# 开发模式运行 打开支持emby的软件填写 `http://[ip]:8096` 即可使用
pnpm run dev
```

# Infuse 与网盘（OneDrive / Google Drive）优化说明

为了解决第三方播放器（特别是 Infuse）连接网盘类媒体库时的频控风暴、403 配额锁定与 429 报错，本项目进行了深度反向适配与底层重构：

### 核心优化特性
1. **Zero-Probing 探测阻断（保护 Google Drive 配额）**：
   - 注入标准音视频媒体流（编码格式、分辨率、声道与采样率），强制声明 `SupportsProbing: false` 与 `RequiresOpening: false`；
   - 彻底阻断 Infuse 在播放前发起的多次 `Range` 文件头探针（ffprobe），实现点开即播，杜绝 Google Drive 24 小时下载配额被快速消耗封锁。
2. **OneDrive 1小时 Token 有效期与签名保护**：
   - 全链路使用 `302 Found` 临时重定向（替代易导致 iOS/Infuse 永久死锁的 308），配合动态安全缓存窗口，在微软 Token 即将过期前自动刷新，彻底解决观影 1 小时后拖动进度条断流（401/403）的问题；
   - 引入安全 URL 处理算法，保护微软 OneDrive/SharePoint 签名参数中的 Base64 特殊字符（如 `%2B`），杜绝二次转义破坏数字签名。
3. **列表元数据饱和传输**：
   - 视频列表接口一次性携带 `Overview`、`Genres`、`People`（演员与导演表）和 `RunTimeTicks`，消除客户端滑动列表时的海量回源详情请求。
4. **TMDB 超清原图与镜像反代**：
   - 支持环境变量 `TMDB_IMAGE_MIRROR` 与 `TMDB_IMAGE_SIZE`（默认 `original` 原图），告别海报模糊，404 图片自动添加 24 小时缓存。
5. **修复继续观看进度卡片**：
   - 填充准确的播放时长 Ticks，恢复 Infuse 首页继续播放卡片进度条。

### 客户端设置注意事项（以 Infuse 为例）

为了获得最流畅的观影体验并最大限度保护网盘 API，建议在 Infuse 中做如下设置：

1. **元数据与插图设置**（路径：`设置` → `元数据与插图`）：
   - **元数据抓取 / 自动下载元数据**：**开启 ✅**（由 Emby 服务端直接分发高清元数据）
   - **优先使用本地插图 (Prefer Local Artwork)**：**关闭 ❌**（避免客户端在网盘目录中翻找不存在的 `poster.jpg` 产生大量 404）
   - **优先使用本地元数据 (Prefer Local Metadata)**：**关闭 ❌**（无需扫描网盘中的 `.nfo`）
   - **优先使用嵌入式插图 (Prefer Embedded Artwork)**：**关闭 ❌**（避免客户端扫描视频文件容器内的内置封面）
2. **媒体库模式设置**（路径：`设置` → `共享` → 点击 Emby 服务器）：
   - **媒体库 (Show in Library)**：建议**关闭 ❌**（切换为直接模式，将常用电影/剧集文件夹固定在首页个人收藏即可，兼顾美观与极致轻量）。

---

欢迎使用 [`emos`](https://emos.lol/) 我们一起愉快观影
