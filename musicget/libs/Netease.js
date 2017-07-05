var Tools = require('../Tools');
var _ = require("underscore");
var Enc = require('../Crypto');
var Config = require('../../config');
var _header = {
    'Host': 'music.163.com',
    'Origin': 'http://music.163.com',
    'Content-Type': 'application/x-www-form-urlencoded'
};

var search_map = {
    "id": function(item) {
        return "netease:" + item["id"];
    },
    "songname": "name",
    "singername": function(item) {
        return item["ar"].map(a => {
            return a["name"];
        }).join(",");
    },
    "albumname": function(item) {
        return item["al"]["name"];
    },
    "params": function(item) {
        return {
            id: item["id"],
            img: item.al.picUrl + '?param=400y400'
        }
    },
    "from": function() {
        return "Netease";
    }
}

//CryptoJS.enc.Utf8.parse
module.exports = {
    Search: async function(key, page, limit) {
        let result = await Tools.Post({
            //"url": `http://music.163.com/weapi/search/suggest/web?csrf_token=`,
            "url": `http://music.163.com/weapi/cloudsearch/get/web?csrf_token=`,
            "type": "json",
            "header": _header,
            "params": Enc.aesRsaEncrypt(JSON.stringify({
                s: key,
                type: 1,
                limit: limit || Config.default_limit,
                offset: ((page || Config.default_page) - 1) * (limit || Config.default_limit),
                "csrf_token": ""
            }))
        });
        //return result.data.result.songs[0];
        if (result.success) return Tools.ColumnMap(result.data.result.songs || [], search_map);
        return [];
    },
    GetPlayUrl: async function(song) {
        let result = await Tools.Post({
            "url": `http://music.163.com/weapi/song/enhance/player/url?csrf_token=`,
            "type": "json",
            "header": _header,
            "params": Enc.aesRsaEncrypt(JSON.stringify({
                "ids": [song["params"]["id"]],
                "br": 320000, //128000
                "csrf_token": ""
            }))
        });
        return result.data.data[0].url || "";
    },
    GetImageUrl: async function(song) {
        return song["params"]["img"];
    },
    GetLyrics: async function(song) {
        let result = await Tools.Post({
            "url": `http://music.163.com/weapi/song/lyric?csrf_token=`,
            "type": "json",
            "header": _header,
            "params": Enc.aesRsaEncrypt(JSON.stringify({
                "os": "osx",
                "id": song["params"]["id"],
                "os": "osx",
                "lv": -1,
                "kv": -1,
                "tv": -1
            }))
        });
        return result.data.lrc || "";
    }
}