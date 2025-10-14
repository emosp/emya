# API文档

所有接口均为 `POST` `application/json` 请求 `Http Status Code` 均为 `200`

## 我调用你的

配置 `API_EXTERNAL`

其中 响应内容为

```json
{
    // 必填 状态码 正常为 200 其余的我将作为http code返回给用户
    "code": 401,
    // code 不为 200 时必填
    "message": "提示内容",
    // 需要响应内容时必填
    "data": {}
}
```

### emby中登录 必接

用户从 `emby` 软件登录时

`post` `/emby/userLogin`

```json
// 请求
{
    "username": "emya",
    "password": "",
    "client": "client",
    "device": "device",
    "deviceid": "deviceid",
    "version": "1.0.0"
}

// 登录成功 请确保 user_id 和 username 都是唯一的
{
    "code": 200,
    "data": {
        // 用户id
        "user_id": 1,
        // 用户名
        "username": "emya",
        // 用户可看媒体库ID
        "folders": [
            1,
            2
        ],
        // 是否可以下载
        "is_can_down": false
    }
}

// 登录失败
{
    "code": 401,
    "message": "用户名或密码错误"
}
```

### emby中用户搜索 可选

用户在 emby 中提交的搜索内容 无需响应

`post` `/emby/userSearch`

```json
// 请求
{
    "user_id": 1121,
    "search": "来啦"
}
```

### emby中用户收藏 可选

用户在 emby 中点击收藏时 无需响应

`post` `/emby/userFavorite`

```json
// 请求
{
    "user_id": 1,
    "relation_type": "vl",
    "relation_id": 3,
    "is_favorite": true
}
```

### 请求播放地址 可选

播放视频时 在 `video_media` 中遇到不认识的 `path_type` 时

`post` `/emby/getVideoUrl`

```json
// 请求
{
    "user_id": 1,
    "path_type": "path_type",
    "path_url": "path_url",
    "uuid": "uuid",
    "line": "line"
}

// 正确响应
{
    "code": 200,
    "data": {
        // 播放地址
        "url": "http://emya/play",
        "cache_seconds": 300
    }
}

// 错误响应
{
    "code": 404,
    "message": "错误内容"
}
```

### 请求字幕地址 可选

播放视频时 在 `video_subtitle` 中遇到不认识的 `path_type` 时

`post` `/emby/subtitleGetUrl`

```json
// 请求
{
    "user_id": 1,
    "path_type": "path_type",
    "path_url": "path_url",
    "subtitle_id": 1
}

// 正确响应
{
    "code": 200,
    "data": {
        // 字幕地址
        "url": "http://emya/subtitle",
        "cache_seconds": 300
    }
}

// 错误响应
{
    "code": 404,
    "message": "错误内容"
}
```

## 你调用我的

- 头部需要带 `API_KEY` 使用


