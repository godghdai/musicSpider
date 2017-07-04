var Koa = require('koa');
var app = new Koa();
var cors = require('koa-cors');
var static = require('koa-static');
var convert = require('koa-convert');
var Router = require('koa-router');
var koaBody = require('koa-body');
var _ = require("underscore");
var fs_promise = require('mz/fs');

var musicLibs = {};
var fs = require('fs');

var path = require('path');
fs.readdirSync(path.join(__dirname, "musicget", "libs")).forEach((file) => {
    musicLibs[path.basename(file, ".js")] = require(`./musicget/libs/${file}`);
})


var router = new Router();
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
        /*
        for (var i = 0; i < libskeys.length; i++) {
            let res = (await musicLibs[libskeys[i]].Search(keyword).catch(b => {
                console.dir(b);
                return [];
            }));
            result = result.concat(res);
        }*/
        //console.dir(result);
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
    let oldData =  JSON.parse(await fs_promise.readFile("downloadlist.json", 'utf8'));
    data=oldData.concat(data);
    await fs_promise.writeFile("downloadlist.json", JSON.stringify(data, null, 4), 'utf8');
    ctx.body = {
        "success": true
    };
});

router.get('/listdownlist', async function(ctx) {
    ctx.body = await fs_promise.readFile("downloadlist.json", 'utf8');
})


var current_socket = null;
var DownloadManger = require('./musicget/Downloader')["DownloadManger"];
var _downloadManger = null;

function getCurrentSocket() {
    return current_socket;
}
router.post('/downloadstart', async function(ctx) {
    let datas = JSON.parse(await fs_promise.readFile("downloadlist.json", 'utf8'));

    _downloadManger = DownloadManger(datas, 3).on("changestatus", function(percentObj) {
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


var http = require('http');
router.get('/getBaiduPlayStream', async function(ctx) {
    var param = ctx.request.query;
    ctx.respond = false;
    http.get(param["url"], function(_req, _res) {
        ctx.res.writeHead(200, {
            'Content-type': _req.headers['content-type'],
            'Content-Length': _req.headers['content-length']
        });
        _req.pipe(ctx.res);
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
            /*
            var total = +(_res.headers['content-length'] || _res.headers['Content-Length']);
            var loaded = 0;
            //_res.text = '';
            _res.on('data', function (chunk) {
                //_res.text += chunk;
                loaded += chunk.length;
            });
            _res.on('end', function () {

            });*/
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
            var userAgent = (ctx.req.headers['user-agent'] || '').toLowerCase();
            var header = {
                'Content-type': _res.headers['content-type'],
                'Content-Length': _res.headers['content-length'],
                "Content-Disposition": 'attachment; filename=' + encodeURIComponent(filename) + '; filename*="utf8\'\'' + encodeURIComponent(filename) + '"'
            };

            ctx.res.writeHead(200, header);
            _res.pipe(ctx.res);
            _res.on('end', function() {
                ctx.res.end();
                console.log('end call');
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
                        _res.pipe(concatStream);
                    } else {

                        filename = data.songname + "_" + data.singername + ext;
                        ctx.res.writeHead(200, {
                            'Content-type': _res.headers['content-type'],
                            'Content-Length': _res.headers['content-length'],
                            "Content-Disposition": 'attachment; filename=' + encodeURIComponent(filename) + '; filename*="utf8\'\'' + encodeURIComponent(filename) + '"'
                        });

                        _res.pipe(ctx.res);
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
            _res.pipe(ctx.res);
            _res.on('end', function() {
                ctx.res.end();
            });

        }).on('error', function(e) {
            console.log("Got error: " + e.message);
            ctx.res.end();
        });
    } else ctx.res.end();
})


app.use(koaBody());
app.use(router.routes());
app.use(router.allowedMethods());

app.use(convert(cors()));
app.use(static(__dirname + '/ext-4.2.1.883'));
app.use(static(__dirname + '/public'));


var server = require('http').createServer(app.callback());
var io = require('socket.io')(server);
var Tools = require('./musicget/Tools');

io.on('connection', function(socket) {

    current_socket = socket;
    /*
        let percentObj = {};
        var songs = _db.getData("/");
        (async function() {
            await Tools.RunTasks(songs, function(song, callback) {

                (async function() {

                    let url = await musicLibs[song.from].GetPlayUrl(song).catch(a => {
                        return "";
                    });
                    await Tools.download({
                        "url": url,
                        "data": song,
                        "path": path.join(__dirname, "downloads", `${song.songname}_${song.singername}.mp3`),
                        "progress": function(event) {
                            //console.dir(event.data.songname + ":" + event.percent);
                            percentObj[event.data.id] = event.percent;
                        }
                    }).catch(a => {

                    });

                })().then(a => {
                    callback(null);
                }).catch(ex => {
                    callback(null);
                });


            }, 4);

            return "aaaa";

        })().then(a => {
            console.dir(a);
        }).catch(ex => {
            console.dir("ex:" + ex);
        });


        setInterval(function() {
            socket.emit('updateprogress', percentObj);
        }, 1000);
    */

    socket.on('disconnect', function() {
        console.log('server disconnected');
    });
    console.dir("server connection.....");
});
server.listen(3000);

//app.listen(3000);
/*
console.log('listening on port 3000');
let child_process = require('child_process'),
    openurl = 'http://localhost:3000/',
    cmd;

if (process.platform == 'win32') {
    cmd = 'start "%ProgramFiles%\Internet Explorer\iexplore.exe"';
} else if (process.platform == 'linux') {
    cmd = 'xdg-open';
} else if (process.platform == 'darwin') {
    cmd = 'open';
}

console.dir(process.platform);
child_process.exec(`${cmd} "${openurl}"`);*/