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

---

欢迎使用 [`emos`](https://emos.lol/) 我们一起愉快观影
