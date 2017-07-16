var Router = require('koa-router');
var _ = require("underscore");
var http = require('http');
var fs_promise = require('mz/fs');
var fs = require('fs');
var path = require('path');
var Config = require('../config');

var DownloadManger = require('./Downloader')["DownloadManger"];

var _current_socket = null;
var _downloadManger = null;

var router = new Router();
var musicLibs = {};
fs.readdirSync(path.join(__dirname, "libs")).forEach((file) => {
    musicLibs[path.basename(file, ".js")] = require(`./libs/${file}`);
})


router.get('/list', async function(ctx) {
    var param = ctx.request.query;
    var page = param["page"],
        start = Number(param["start"]),
        limit = Number(param["limit"]),
        sort = param["sort"],
        dir = param["dir"];

    var keyword = param["keyword"];
    var _from = param["from"];
    if (keyword != "") {
        //let libskeys = Object.keys(musicLibs);
        let libskeys = _from.split(",");
        let result = [];

        result = await Promise.all(libskeys.map(key => {
            return musicLibs[key].Search(keyword).catch(b => {
                console.dir(b);
                return [];
            })
        }));

        ctx.body = _.flatten(result);
    } else {
        var _menu = param["menu"],
            res = [];
        switch (_menu) {
            case "酷我畅销榜":
                res = (await musicLibs["Kuwo"].GetTop().catch(b => {
                    return [];
                }));
                break;
            default:
                // "QQ巅峰榜·热歌":
                res = (await musicLibs["QQ"].GetTop(page, limit).catch(b => {
                    return [];
                }));
                break

        }

        ctx.body = res;
    }
});



router.post('/downloadsave', async function(ctx) {
    let data = JSON.parse(ctx.request.body.data);
    console.dir(data);
    let oldData = JSON.parse(await fs_promise.readFile("downloadlist.json", 'utf8'));
    data = oldData.concat(data);
    await fs_promise.writeFile("downloadlist.json", JSON.stringify(data, null, 4), 'utf8');
    ctx.body = {
        "success": true
    };
});

router.get('/listdownlist', async function(ctx) {
    ctx.body = await fs_promise.readFile("downloadlist.json", 'utf8');
})


router.post('/downloadstart', async function(ctx) {
    let datas = JSON.parse(await fs_promise.readFile("downloadlist.json", 'utf8'));
   
    _downloadManger = DownloadManger(datas, Config.default_download_limit).on("changestatus", function(percentObj) {
        getCurrentSocket().emit('changestatus', percentObj);
    }).on("needtosave", function(songs) {
        fs_promise.writeFile("downloadlist.json", JSON.stringify(songs, null, 4), 'utf8').then(a => {
            console.log("save to file!!!!");
        });
    }).start();

    ctx.body = {
        "success": true
    };
})

router.post('/downloadstop', async function(ctx) {
    let songs = JSON.parse(ctx.request.body.data);
    //console.dir(song);
    _downloadManger.stopdownload(songs);

    ctx.body = {
        "success": true
    };
})

router.post('/restartdownload', async function(ctx) {
    let song = JSON.parse(ctx.request.body.data);
    console.dir(song);
    _downloadManger.restartdownload(song);
    ctx.body = {
        "success": true
    };
})


router.post('/getPlayUrl', async function(ctx) {
    let data = JSON.parse(ctx.request.body.data);
    let url = await musicLibs[data.from].GetPlayUrl(data);
    console.dir(data);
    console.dir(url);
    ctx.body = url;
});


router.get('/getPlayUrl', async function(ctx) {
    var param = ctx.request.query["data"];
    let data = JSON.parse(unescape(param));
	let url = await musicLibs[data.from].GetPlayUrl(data);
    ctx.body = url;
});


router.get('/getBaiduPlayStream', async function(ctx) {
    var param = ctx.request.query;
    ctx.respond = false;
    http.get(param["url"], function(_req, _res) {
        ctx.res.writeHead(200, {
            'Content-type': _req.headers['content-type'],
            'Content-Length': _req.headers['content-length']
        });
        _req.on('error', function(e) {
            console.dir(e);
            ctx.res.end();
        }).pipe(ctx.res);
        _req.on('end', function() {
            ctx.res.end();
            console.log('end call');
        });

    })
});

var getRedirectUrl = function(url, callback) {
    console.log("url:" + url);
    http.get(url, function(_res) {
        if ([301, 302, 303, 305, 307, 308].indexOf(_res.statusCode) != -1) {
            let newurl = _res.headers.location;
            console.dir("redirect:" + newurl);
            return getRedirectUrl(newurl, callback);
        }
        if (_res.statusCode == 200) {
            return callback(null, _res);
        }
        callback(_res.statusCode)
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
        callback(e.message);
    });
}

router.get('/downloadUrl', async function(ctx) {

    var param = ctx.request.query["data"];
    let data = JSON.parse(unescape(param));
    let downurl = await musicLibs[data.from].GetPlayUrl(data);
    downurl = encodeURI(downurl);
    if ((downurl || "").length > 0) {
        ctx.respond = false;

        getRedirectUrl(downurl, function(err, _res) {
            if (err) {
                console.dir(err);
                return ctx.res.end();
            }
            var filename = data.songname + "_" + data.singername + ".mp3";
            ctx.res.writeHead(200, {
                'Content-type': _res.headers['content-type'],
                'Content-Length': _res.headers['content-length'],
                "Content-Disposition": 'attachment; filename=' + encodeURIComponent(filename) + '; filename*="utf8\'\'' + encodeURIComponent(filename) + '"'
            });
            _res.on('error', function(e) {
                console.dir(e);
                ctx.res.end();
            }).pipe(ctx.res);
            _res.on('end', function() {
                ctx.res.end();

            });
        });

    }
});

router.get('/downloadLrcUrl', async function(ctx) {

    var param = ctx.request.query["data"];
    let data = JSON.parse(unescape(param));
    let downurl = await musicLibs[data.from].GetLyrics(data);
    console.dir(downurl);
    ctx.respond = false;
    switch (data["from"]) {
        case "Baidu":
        case "Xiami":
            if (downurl.length > 0) {
                let ext = "";
                /(\.\w+)$/.test(downurl);
                ext = RegExp.$1;
                var filename = "";
                http.get(downurl, function(_res) {
                    console.dir(_res.headers);

                    if (data["from"] == "Xiami" && ext == ".trc") {
                        filename = data.songname + "_" + data.singername + ".lrc";
                        ctx.res.writeHead(200, {
                            'Content-type': 'application/lrc',
                            "Content-Disposition": 'attachment; filename=' + encodeURIComponent(filename) + '; filename*="utf8\'\'' + encodeURIComponent(filename) + '"'
                        });
                        var concat = require('concat-stream');
                        //.trc =>.lrc
                        var concatStream = concat(function(str) {
                            str = str.toString().replace(/<\d+>/g, "");
                            ctx.res.end(str);
                        })
                        _res.on('error', function(e) {
                            console.dir(e);
                            ctx.res.end();
                        }).pipe(concatStream);

                    } else {

                        filename = data.songname + "_" + data.singername + ext;
                        ctx.res.writeHead(200, {
                            'Content-type': _res.headers['content-type'],
                            'Content-Length': _res.headers['content-length'],
                            "Content-Disposition": 'attachment; filename=' + encodeURIComponent(filename) + '; filename*="utf8\'\'' + encodeURIComponent(filename) + '"'
                        });

                        _res.on('error', function(e) {
                            console.dir(e);
                            ctx.res.end();
                        }).pipe(ctx.res);
                        _res.on('end', function() {
                            ctx.res.end();
                        });
                    }

                }).on('error', function(e) {
                    console.log("Got error: " + e.message);
                    ctx.res.end();
                });
            } else
                ctx.res.end();
            break;
        case "Kugou":
        case "QQ":
        case "Netease":
        case "Kuwo":
        case "Migu":
            var filename = data.songname + "_" + data.singername + ".lrc";
            ctx.res.writeHead(200, {
                'Content-type': 'application/lrc',
                "Content-Disposition": 'attachment; filename=' + encodeURIComponent(filename) + '; filename*="utf8\'\'' + encodeURIComponent(filename) + '"'
            });
            switch (data["from"]) {
                case "Kugou":
                    ctx.res.write(`[ti:${data.songname}]\r\n`);
                    ctx.res.write(`[ar:${data.singername}]\r\n`);
                    ctx.res.write(`[al:${data.albumname}]\r\n`);
                    ctx.res.end(downurl);
                    break;
                case "Netease":
                    ctx.res.end(downurl.lyric);
                    break;
                case "QQ":
                case "Migu":
                    ctx.res.end(downurl);
                    break;
                case "Kuwo":
                    var text = '[ti:' + data.songname + ']\r\n' +
                        '[ar:' + data.singername + ']\r\n' +
                        '[al:' + data.albumname + ']\r\n';

                    for (var i = 0; i < downurl.length; i++) {
                        var sec = downurl[i].time;
                        var hsec = parseInt(sec * 100);
                        var min = parseInt(hsec / 6000) + "";
                        sec = parseInt((hsec % 6000) / 100) + "";
                        text += ('[' + "00".substring(0, 2 - min.length) + min + ':' + "00".substring(0, 2 - sec.length) + sec + '.' + '50' + ']' + downurl[i].lineLyric + '\r\n');
                    }
                    console.dir(text);
                    ctx.res.end(text);
                    break;
            }
            break;

    }

});


router.get('/getImgUrl', async function(ctx) {
    var param = ctx.request.query["data"];
    let data = JSON.parse(unescape(param));
    console.dir(data);
    let downurl = await musicLibs[data.from].GetImageUrl(data);
    console.dir(downurl);
    ctx.respond = false;
    if (downurl.length > 0) {
        http.get(downurl, function(_res) {
            ctx.res.writeHead(200, {
                'Content-type': _res.headers['content-type'],
                'Content-Length': _res.headers['content-length']
            });
            _res.on('error', function(e) {
                console.dir(e);
                ctx.res.end();
            }).pipe(ctx.res);
            _res.on('end', function() {
                ctx.res.end();
            });

        }).on('error', function(e) {
            console.log("Got error: " + e.message);
            ctx.res.end();
        });
    } else ctx.res.end();
})


function getCurrentSocket() {
    return _current_socket;
}

module.exports = {
    "use": function(app) {
        app.use(router.routes());
        app.use(router.allowedMethods());
        return router;
    },
    "socket": function(socket) {
        _current_socket = socket;
    }
}