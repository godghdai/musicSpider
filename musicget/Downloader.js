var http = require('http');
var parse = require('url').parse;
var util = require("util");
var EventEmitter = require("events").EventEmitter;
var fs = require('fs');
var Transform = require('stream').Transform;
var _ = require("underscore");
var path = require('path');
var Config = require('../config');

function Request(options) {
    EventEmitter.call(this);
    var _self = this;
    this.req = null;
    this.res = null;
    this.url = options.url;
    this.method = options.method || 'GET';
    var opt = parse(this.url);
    var _options = {
        port: opt.port,
        host: opt.host,
        hostname: opt.hostname,
        path: opt.path,
        method: _self.method,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
            'Connection': 'keep-alive'
        }
    };
    Object.assign(_options.headers, options["header"] || {});

    var req = _self.req = http.request(_options, function(res) {
        res.length = 0;
        res.text = '';
        res.on('data', function(chunk) {
            res.length += chunk.length;
            //res.text += chunk;
        });
        res.on('end', function() {
            if (_self.method == "HEAD")
                return _self.emit('end', res.headers);

            _self.emit('end', {
                "text": res.text,
                "length": res.length
            });
        });

    });

    req.on('error', function(e) {
        _self.emit('error', e);
    });
    req.end();

    this.addListener = function(listeners) {
        if (_.isObject(listeners)) {
            _.each(listeners, function(value, key) {
                if (_.isFunction(value)) {
                    _self.on(key, value);
                }
            });
        }
        return _self;
    }

    if (options.listeners) {
        this.addListener(options.listeners);
    }

}
util.inherits(Request, EventEmitter);

function Downloader(options) {
    this.savepath = options.path;
    this.writestream = null;
    this._stop_flag = false;
    var _self = this;

    var range = "bytes=0-";
    var isExist = fs.existsSync(this.savepath);
    var downloadsize = 0;
    if (isExist) {
        downloadsize = fs.statSync(this.savepath).size;
        range = `bytes=${downloadsize}-`;
    }
    //console.dir(range);
    Request.call(this, {
        "url": options.url,
        "header": {
            'Range': range
        },
        "listeners": options.listeners || {}
    });

    this.stop = function() {
        if (_self.res != null && _self.writestream != null) {
            _self._stop_flag = true;
            _self.res.unpipe(_self.writestream);
            _self.writestream.end();
            _self.req.abort();
        }

    }
    this.req.once("response", function(res) {
        _self.res = res;
        var loaded = downloadsize;
        // 'content-range': 'bytes 266240-3769904/3769905',
        /(\d+)-(\d+)\/(\d+)/.test(res.headers['content-range']);
        var total = +RegExp.$3; //+(res.headers['content-length'] || res.headers['Content-Length']);
        // console.dir(res.headers);
        var getProgressMonitor = function() {
            var progress = new Transform();
            progress._transform = function(chunk, encoding, cb) {
                loaded += chunk.length;
                _self.emit('progress', {
                    percent: (loaded / total * 100).toFixed(2),
                    loaded: loaded,
                    total: total
                });
                cb(null, chunk);
            };
            return progress;
        };

        _self.writestream = fs.createWriteStream(_self.savepath, {
            'flags': isExist ? 'a' : 'w'
        });
        _self.writestream.on('unpipe', (src) => {

            if (_self._stop_flag) {
                console.log("dowloadstop......");
                _self.emit('dowloadstop', {
                    total,
                    loaded
                });
            }
        }).on('close', function() {
            //下载完毕后 重命名
            if (loaded == total) {
                console.log("complete......");
                _self.emit('complete');
            }
        });
        res.on('error', function(e) {
            _self.emit('error', e);
        }).pipe(getProgressMonitor()).pipe(_self.writestream).on('error', function(e) {
            _self.emit('error', e);
        });
    });
}
util.inherits(Downloader, Request);



var musicLibs = null;

function init() {
    if (musicLibs != null) return musicLibs;
    musicLibs = {};
    fs.readdirSync(path.join(__dirname, "libs")).forEach((file) => {
        musicLibs[path.basename(file, ".js")] = require(`./libs/${file}`);
    })
}

function DownloadManger(songs, limit) {
    this.limit = limit || 2;
    this.songs = songs;
    this.downloaders = {};
    var _self = this;
    EventEmitter.call(this);
    this.songsDic = {};
    this.downloadSongsQueue = [];
    this.lastDownloader = null;
    for (var i = 0; i < songs.length; i++) {
        songs[i]["_index"] = i;
        //songs[i]["status"] = "等待中";
        this.songsDic[songs[i]["id"]] = songs[i];
        if (songs[i]["status"] != "已完成")
            this.downloadSongsQueue.push(songs[i]);
    }

    this.getdownloader = function(song) {
        var filename = `${song.songname}_${song.singername}`;
        return new Downloader({
            "url": song.playurl,
            "path": path.join(Config.default_download_path || "", `${filename}.tmp`),
            "listeners": {
                "end": function(result) {
                    //console.dir(result);
                },
                "progress": function(result) {

                    _self.emitmsg({
                        "status": "progress",
                        "progress": result,
                        "song": song
                    });
                },
                "dowloadstop": function(obj) {
                    _self.emitmsg({
                        "status": "stop",
                        "song": song
                    });
                },
                "complete": function(result) {
                    let _from = path.join(Config.default_download_path || "", `${filename}.tmp`);
                    let _to = path.join(Config.default_download_path || "", `${filename}.mp3`);
                    fs.renameSync(_from, _to);
                    //console.log("complete");
                    _self.emitmsg({
                        "status": "complete",
                        "song": song
                    });
                },
                "error": function(err) {
                    _self.emitmsg({
                        "status": "error",
                        "err": err,
                        "song": song
                    });
                }
            }
        });
    }

    this._stop_flag = false;
    this.start = function() {
        init();
        _self._stop_flag = false;
        var song;
        var end = _self.downloadSongsQueue.length >= _self.limit ? _self.limit : _self.downloadSongsQueue.length;
        for (var i = 0; i < end; i++) {
            song = _self.downloadSongsQueue.shift();
            _self.beginstart(song);
        }
        _self.interval = setInterval(function() {
            var result = {};
            _.each(_self.songsDic, function(value, key, list) {
                result[key] = {
                    "progress": value.progress,
                    "status": value.status
                };
            });
            //console.dir(result);
            _self.emit("changestatus", result);
        }, 500);

        return this;
    }

    this.stop = function() {
        _self._stop_flag = true;
        clearInterval(_self.interval);
        if (Object.keys(_self.downloaders).length > 0) {
            _.each(_self.downloaders, function(value, key, list) {
                value.stop();
                _self.chageSongStatus(key, "已停止");
            });
        }
    }

    this.emitmsg = function(msg) {
        switch (msg.status) {
            case "progress":
                _self.songsDic[msg.song["id"]]["progress"] = msg.progress.percent;
                break;
            case "stop":
                //console.dir("stop:" + msg);
                // break;
            case "complete":
                delete _self.downloaders[msg.song.id];
               // delete _self.songsDic[msg.song.id];
                if (msg.status == "complete") {
                    _self.songsDic[msg.song.id]["complete"] = 1;
                    _self.chageSongStatus(msg.song.id, "已完成");
                }
                if (!_self._stop_flag)
                    _self.next();
                break;
            case "error":
                _self.chageSongStatus(msg.song.id, "ERROR");
                _self.songsDic[msg.song.id]["try"] = (_self.songsDic[msg.song.id]["try"] || 0) + 1;
                console.dir(msg.err);
                //重试两次
                if (_self.songsDic[msg.song.id]["try"] < 4) {
                    //增加到队列头
                    _self.downloadSongsQueue.unshift(msg.song);
                }
                if (!_self._stop_flag)
                    _self.next();
                break;
        }
        if (msg.status != "progress") {
            _self.emit("needtosave", _self.songs);
        }
    }

    this.next = function() {
        var nextsong = _self.downloadSongsQueue.shift() || null;
        if (nextsong != null) this.beginstart(nextsong);
    }
    this.stopdownload = function(songs) {
        if (!_.isArray(songs)) songs = [songs];
        _.each(songs, function(song, index, list) {
            if (_self.downloaders[song.id] != null) {
                _self.downloaders[song.id].stop();
                _self.chageSongStatus(song.id, "已暂停");
            }
        });
    }

    this.restartdownload = function(song) {
        var songids = Object.keys(_self.downloaders);

        if (songids.length == _self.limit) {
            //增加到队列头
            _self.downloadSongsQueue.unshift(song);
            //停止 最后一个正在下载的
            var last_songid = songids.map(id => {
                return {
                    "songid": id,
                    "_index": _self.songsDic[id]["_index"]
                };
            }).sort((a, b) => {
                return b._index - a._index;
            })[0]["songid"];
            if (_self.downloaders[last_songid] != null) {
                _self.downloaders[last_songid].stop();
                _self.chageSongStatus(last_songid, "已暂停");
            }
        } else {
            //增加到队列头
            _self.downloadSongsQueue.unshift(song);
            if (!_self._stop_flag)
                _self.next();
        }
    }

    this.chageSongStatus = function(songid, status) {
        _self.songsDic[songid]["status"] = status;
    }

    this.beginstart = function(song) {
        //console.dir(song);
        musicLibs[song.from].GetPlayUrl(song).then(url => {
            song.playurl = url;
            _self.downloaders[song.id] = _self.getdownloader(song);
            _self.chageSongStatus(song.id, "下载中");
        }).catch(a => {
            _self.emit('error', a);
        });
    }

    this.addSongs = function(songs) {
        _.each(songs, function(song, index, list) {
            if (!_.has(_self.songsDic, song.id)) {
                _self.downloadSongsQueue.push(song);
            }
        });
    }
}
util.inherits(DownloadManger, EventEmitter);

module.exports = {
    Downloader: function(options) {
        return new Downloader(options);
    },
    DownloadManger: function(songs, limit) {
        return new DownloadManger(songs, limit);
    },
    Request: function(options) {
        return new Request(options);
        /*
              new Request({
                  "url": url,
                  "method": "HEAD",
                  "header": {
                      'Range': "bytes=0-"
                  }
              }).on("finish", function(header) {
                  console.dir(header)
              });*/
    }
}