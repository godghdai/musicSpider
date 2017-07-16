#### 歌曲搜刮器有哪些功能？

* 免登录，免去多平台去找歌、找歌词、限制下载的烦恼
* 支持多个平台检索歌曲，酷狗音乐,酷我音乐,虾米,咪咕,QQ云音乐,网易云音乐,百度音乐
* 支持歌曲在线播放和批量下载，且提拱歌词下载功能

![Alt text](./GIF.gif)

#### 系统需求
```bash
node 最小版本 v7.10.0 
```

#### 安装启动
```bash
npm install 
node app.js
```

#### 默认配置 config.js
```js
 {
    default_page: 1,
    //搜索返回的数目
    default_limit: 5,
    //下载路径
    default_download_path: path.resolve(__dirname, "./downloads"),
    //最大同时下载数
    default_download_limit: 3 
}
```

#### 感激以下的项目
* [APlayer](https://github.com/DIYgod/APlayer) 
* [Koa2](https://github.com/koajs/koa)
* [Socket.io](https://github.com/socketio/socket.io)
* [Superagent](https://github.com/visionmedia/superagent)
* [Cheerio](https://github.com/cheeriojs/cheerio)
* [ExtJS](https://www.sencha.com/)

