var Tools = require('../Tools');
var Config = require('../../config');
var _ = require("underscore");
var _header = {
    'Host': 'songsearch.kugou.com',
    'Referer': 'http://www.kugou.com/yy/html/search.html'
};

var search_map = {
    "id": function(item) {
        return "kugou:" + item["ID"];
    },
    "songname": function(item) {
        //console.dir(item["FileName"]);
        //console.dir(item["FileName"].replace(/\<\/?em\>/g, ''));
        return item["FileName"].replace(/\<\/?em\>/g, '');
    },
    "singername": "SingerName",
    "albumname": "AlbumName",
    "params": function(item) {
        return {
            "hash": item["FileHash"],
            "album_id": item["AlbumID"]
        }
    },
    "from": function() {
        return "Kugou";
    }
}

module.exports = {
    Search: async function(key, page, limit) {
        let result = await Tools.Get({
            "url": "http://songsearch.kugou.com/song_search_v2",
            "type": "json",
            "header": _header,
            "params": {
                "keyword": key,
                "page": page || Config.default_page,
                "pagesize": limit || Config.default_limit,
                "userid": -1,
                "clientver": "",
                "platform": "WebFilter",
                "tag": "em",
                "filter": 2,
                "iscorrection": 1,
                "privilege_filter": 0,
                "_": Date.now()
            }
        });
        if (result.success)
            return Tools.ColumnMap(result.data.data.lists || [], search_map).slice(0, Config.default_limit);
        return result;

    },
    GetInfos: async function(song) {
        let result = await Tools.Get({
            "url": "http://www.kugou.com/yy/index.php",
            "type": "json",
            "header": {
                'Host': 'www.kugou.com',
                'Referer': 'http://www.kugou.com/song/'
            },
            "params": {
                "r": "play/getdata",
                "hash": song["params"]["hash"],
                "album_id": song["params"]["album_id"]
            }
        });
        if (result.success) return result.data.data;
        return {
            "img": "",
            "play_url": "",
            "lyrics": ""
        };
    },
    GetPlayUrl: async function(song) {
        return (await this.GetInfos(song))["play_url"];
    },
    GetImageUrl: async function(song) {
        return (await this.GetInfos(song))["img"];
    },
    GetLyrics: async function(song) {
        return (await this.GetInfos(song))["lyrics"];
    }
}