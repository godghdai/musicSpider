var Tools = require('../Tools');
var Config = require('../../config');
var _ = require("underscore");
var _header = {
    //'Host': 'https://m.y.qq.com',有此字段请求不到数据
    'Origin': 'https://m.y.qq.com',
    'Referer': 'https://m.y.qq.com/'
};

var search_map = {
    "id": function(item) {
        return "QQ:" + item["mid"];
    },
    "songname": "title",
    "singername": function(item) {
        return item["singer"].map(a => {
            return a["name"].trim();
        }).join(",");
    },
    "albumname": function(item) {
        return item["album"]["name"];
    },
    "params": function(item) {
        return {
            "mid": item["mid"],
            "strMediaMid": item["file"]["strMediaMid"],
            "albummid": item["albummid"]
        }
    },
    "from": function() {
        return "QQ";
    }
}

var r = {
    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    encode: function(e) {
        var o, t, n, c, a, d, h, C = "",
            f = 0;
        for (e = r._utf8_encode(e); f < e.length;) o = e.charCodeAt(f++), t = e.charCodeAt(f++), n = e.charCodeAt(f++), c = o >> 2, a = (3 & o) << 4 | t >> 4, d = (15 & t) << 2 | n >> 6, h = 63 & n, isNaN(t) ? d = h = 64 : isNaN(n) && (h = 64), C = C + r._keyStr.charAt(c) + r._keyStr.charAt(a) + r._keyStr.charAt(d) + r._keyStr.charAt(h);
        return C
    },
    decode: function(e) {
        var o, t, n, c, a, d, h, C = "",
            f = 0;
        for (e = e.replace(/[^A-Za-z0-9\+\/\=]/g, ""); f < e.length;) c = r._keyStr.indexOf(e.charAt(f++)), a = r._keyStr.indexOf(e.charAt(f++)), d = r._keyStr.indexOf(e.charAt(f++)), h = r._keyStr.indexOf(e.charAt(f++)), o = c << 2 | a >> 4, t = (15 & a) << 4 | d >> 2, n = (3 & d) << 6 | h, C += String.fromCharCode(o), 64 != d && (C += String.fromCharCode(t)), 64 != h && (C += String.fromCharCode(n));
        return C = r._utf8_decode(C)
    },
    _utf8_encode: function(r) {
        r = r.replace(/\r\n/g, "\n");
        for (var e = "", o = 0; o < r.length; o++) {
            var t = r.charCodeAt(o);
            128 > t ? e += String.fromCharCode(t) : t > 127 && 2048 > t ? (e += String.fromCharCode(t >> 6 | 192), e += String.fromCharCode(63 & t | 128)) : (e += String.fromCharCode(t >> 12 | 224), e += String.fromCharCode(t >> 6 & 63 | 128), e += String.fromCharCode(63 & t | 128))
        }
        return e
    },
    _utf8_decode: function(r) {
        for (var e = "", o = 0, t = c1 = c2 = 0; o < r.length;) t = r.charCodeAt(o), 128 > t ? (e += String.fromCharCode(t), o++) : t > 191 && 224 > t ? (c2 = r.charCodeAt(o + 1), e += String.fromCharCode((31 & t) << 6 | 63 & c2), o += 2) : (c2 = r.charCodeAt(o + 1), c3 = r.charCodeAt(o + 2), e += String.fromCharCode((15 & t) << 12 | (63 & c2) << 6 | 63 & c3), o += 3);
        return e
    }
};


function getGuid() {
    var e;
    e = (new Date).getUTCMilliseconds();
    return Math.round(2147483647 * Math.random()) * e % 1e10;
}


module.exports = {
    Search: async function(key, page, limit) {
        let songs = await Tools.Get({
            "url": "https://c.y.qq.com/soso/fcgi-bin/client_search_cp",
            "type": "json",
            "header": _header,
            "params": {
                ct: 24,
                qqmusic_ver: 1298,
                new_json: 1,
                remoteplace: 'txt.yqq.center',
                t: 0,
                aggr: 1,
                cr: 1,
                catZhida: 1,
                lossless: 0,
                flag_qc: 0,
                p: page || Config.default_page,
                n: limit || Config.default_limit,
                w: key,
                g_tk: 5381,
                loginUin: 0,
                hostUin: 0,
                format: 'json',
                inCharset: 'utf8',
                outCharset: 'utf-8',
                notice: 0,
                platform: 'yqq',
                needNewCode: 0
            }
        });
        // return songs.data.data.song.list[0];
       if (songs.success)  return Tools.ColumnMap(songs.data.data.song.list || [], search_map);
       return [];
    },
    GetPlayUrl: async function(song) {
        var _guid = getGuid();

        let songmids = [];
        let filenames = [];

        let songmid = song["params"]["mid"];
        let filename = `C400${songmid}.m4a`;

        songmids.push(songmid);
        filenames.push(filename);

        let result = await Tools.Get({
            "url": `https://c.y.qq.com/base/fcgi-bin/fcg_music_express_mobile3.fcg?songmid=${songmids.join(",")}&filename=${filenames.join(",")}`,
            "type": "json",
            "params": {
                g_tk: 5381,
                loginUin: 0,
                hostUin: 0,
                format: 'jsonp',
                inCharset: 'utf8',
                outCharset: 'utf-8',
                notice: 0,
                platform: 'yqq',
                needNewCode: 0,
                cid: 205361747,
                uin: 0,
                guid: _guid
            }
        })
        let key = result.data.data.items[0].vkey;
        return `http://dl.stream.qqmusic.qq.com/${filename}?vkey=${key}&guid=${_guid}&uin=0&fromtag=66`
    },
    GetLyrics: async function(song) {
        let result = await Tools.Get({
            "url": `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg`,
            "type": "text",
            "header": {
                referer: "https://y.qq.com/portal/player.html"
            },
            "params": {
                callback: '',
                jsonpCallback: '',
                pcachetime: (new Date).getTime(),
                songmid: song["params"]["mid"],
                g_tk: 5381,
                loginUin: 0,
                hostUin: 0,
                format: 'json',
                inCharset: 'utf8',
                outCharset: 'utf-8',
                notice: 0,
                platform: 'yqq',
                needNewCode: 0
            }
        });
        /"lyric":"([^"]+)"/.test(result.data);
        return r.decode(RegExp.$1);
    },

    GetImageUrl: async function(song) {
        return `http://y.gtimg.cn/music/photo_new/T002R300x300M000${song["params"]["albummid"]}.jpg?max_age=259200`;
    },
    GetTop: async function(page, limit) {
        let result = await Tools.Get({
            "url": 'https://c.y.qq.com/v8/fcg-bin/fcg_v8_toplist_cp.fcg',
            "type": "json",
            "header": {
                referer: "https://y.qq.com/n/yqq/toplist/26.html"
            },
            "params": {
                tpl: 3,
                page: 'detail',
                date: '2017_26',
                topid: 26,
                type: 'top',
                song_begin: (page - 1) * (limit || 30),
                song_num: limit || 30,
                g_tk: 5381,
                //jsonpCallback:MusicJsonCallbacktoplist
                loginUin: 0,
                hostUin: 0,
                format: 'jsonp',
                inCharset: 'utf8',
                outCharset: 'utf-8',
                notice: 0,
                platform: 'yqq',
                needNewCode: 0
            }
        })

        let data = (result.data.songlist || []).map(item => {
            return {
                "id": "qq:" + item.data.songid,
                "songname": item.data.songname,
                "singername": item.data.singer.map(a => {
                    return a["name"];
                }).join(","),
                "albumname": item.data.albumname,
                "params": {
                    "mid": item.data["songmid"],
                    "albummid": item.data["albummid"],
                    "strMediaMid": item.data["strMediaMid"]
                },
                "from": "QQ"
            }
        });
        return {
            'datas': data,
            'total': result.data.total_song_num
        };

    }
}