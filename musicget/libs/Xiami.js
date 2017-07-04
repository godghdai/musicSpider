var Tools = require('../Tools');
var _ = require("underscore");
var Config = require('../../config');
var _header = {
    'Host': 'www.xiami.com',
    'Origin': 'www.xiami.com'
};

function sospa(e) {
    var a = parseInt(e);
    var r = e.substr(1);
    var n = Math.floor(r.length / a);
    var i = r.length % a;
    var s = new Array;
    var l;
    for (l = 0; l < i; l++) {
        s[l] = r.substr((n + 1) * l, n + 1)
    }
    for (l = i; l < a; l++) {
        s[l] = r.substr(n * (l - i) + (n + 1) * i, n)
    }
    var o = "";
    for (l = 0; l < s[0].length; l++) {
        for (j = 0; j < s.length; j++) {
            o += s[j].substr(l, 1)
        }
    }
    o = rtan(o);
    var p = "";
    for (l = 0; l < o.length; l++) {
        if (o.substr(l, 1) == "^") {
            p += "0"
        } else {
            p += o.substr(l, 1)
        }
    }
    return unescape(p)
}


function rtan(e) {
    var t = "";
    for (var a = 0; a < e.length; a++) {
        var r = e.charAt(a);
        if (r == "+") {
            t += " "
        } else if (r == "%") {
            var n = e.substring(a + 1, a + 3);
            if (parseInt("0x" + n) > 127) {
                t += String.fromCharCode(parseInt("0x" + n + e.substring(a + 4, a + 6)));
                a += 5
            } else {
                t += String.fromCharCode(parseInt("0x" + n));
                a += 2
            }
        } else {
            t += r
        }
    }
    return t
}

var search_map = {
    "id": function(item) {
        return "xiami:" + item["song_id"];
    },
    "songname": "song_name",
    "singername": "artist_name",
    "albumname": "album_name",
    "params": function(item) {
        return _.pick(item, "song_id", "album_logo", "artist_logo", "listen_file", "lyric")
    },
    "from": function() {
        return "Xiami";
    }
}

var search_map2 = {
    "id": function(item) {
        return "xiami:" + item["songId"];
    },
    "songname": "songName",
    "singername": "singers",
    "albumname": "album_name",
    "params": function(item) {
        return {
            "song_id": item["songId"],
            "album_logo": item["album_pic"],
            "artist_logo": "",
            "listen_file": item["mp3_url"],
            "lyric": item["lyric_url"]
        }
    },
    "from": function() {
        return "虾米";
    }
}


module.exports = {
    Search: async function(key, page, limit) {
        let result = await Tools.Get({
            "url": "http://api.xiami.com/web",
            "type": "json",
            "header": {
                'Origin': 'api.xiami.com',
                "Referer": 'http://h.xiami.com/',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Mobile Safari/537.36'
            },
            "params": {
                v: 2.0,
                app_key: 1,
                key: key,
                page: page || Config.default_page,
                limit: limit || Config.default_limit,
                r: 'search/songs'
            }
        });
        if (result.success) {
            return Tools.ColumnMap(result.data.data.songs || [], search_map);
        }
        return [];
    },
    GetPlayUrl: async function(song) {
        return song["params"].listen_file;
    },
    GetImageUrl: async function(song) {
        return song["params"].album_logo;
    },
    GetLyrics: async function(song) {
        return song["params"].lyric;
    },
    Search2: async function(key, limit) {
        let result = await Tools.Get({
            "url": "http://www.xiami.com/search",
            "type": "html",
            "header": _header,
            "params": {
                "key": key
            }
        });

        if (result.success) {
            let $ = result.data;
            let data2 = [],
                songids = [],
                tr, songid;
            $(".track_list tbody tr").each((i, e) => {
                tr = $(e);
                songid = /play\(&apos;(\d+)&apos;/.test(tr.find(".song_do").html()) ? RegExp.$1 : "";
                data2.push({
                    "song_name": tr.find(".song_name a").attr("title"),
                    "song_artist": tr.find(".song_artist a").attr("title"),
                    "song_album": tr.find(".song_album a").attr("title"),
                    "songid": songid
                });
                songids.push(songid);
            })

            if (songids.length == 0) return [];

            let detail = await Tools.Get({
                "url": `http://www.xiami.com/song/playlist/id/${songids.slice(0, Config.default_limit).join(",")}/object_name/default/object_id/0/cat/json`,
                "type": "json",
                "header": _header,
            });

            if (detail.success) {
                let data = detail.data;
                let songs = [];
                data["data"]["trackList"].forEach((cur, i) => {
                    songs[i] = _.pick(cur, "songId", "songName", "singers", "lyric_url", "album_name", "album_pic");
                    songs[i]["mp3_url"] = sospa(cur["location"]);
                });
                return Tools.ColumnMap(songs || [], search_map2);
            }

        }
        return [];
    }
}