var Tools = require('../Tools');
var Config = require('../../config');
var _ = require("underscore");
var _header = {
    'Host': 'songsearch.kugou.com',
    'Referer': 'http://www.kugou.com/yy/html/search.html'
};

var search_map = {
    "id": function (item) {
        return "baidu:" + item["songid"];
    },
    "songname": "songname",
    "singername": "artistname",
    "albumname": "info",
    "params": function (item) {
        return {
            "songid": item["songid"]
        }
    },
    "from": function () {
        return "Baidu";
    }
}

module.exports = {
    Search: async function (key, page, limit) {
        let result = await Tools.Get({
            "url": "http://musicapi.qianqian.com/v1/restserver/ting",
            "type": "json",
            "params": {
                from: 'webapp_music',
                method: 'baidu.ting.search.catalogSug',
                format: 'json',
                query: key,
                s_protocol: "",
                _: Date.now()
            }
        });

        if (result.success)
            return Tools.ColumnMap(result.data.song || [], search_map).slice(0, Config.default_limit);
        return [];

    },
    GetInfos: async function (song) {
        let result = await Tools.Post({
            "url": "http://play.baidu.com/data/cloud/songlink",
            "type": "json",
            "header": {
                'Host': 'play.baidu.com',
                'Origin': 'http://play.baidu.com'
            },
            "params": {
                songIds: song["params"]["songid"],
                hq: 0,
                type: 'm4a,mp3',
                rate: '',
                pt: 0,
                flag: -1,
                s2p: -1,
                prerate: -1,
                bwt: -1,
                dur: -1,
                bat: -1,
                bp: -1,
                pos: -1,
                auto: -1
            }
        })
        if (result.success) return result.data.data.songList[0];
        return {
            "songLink": "",
            "lrcLink": ""
        };
    },
    GetPlayUrl: async function (song) {
        return (await this.GetInfos(song))["songLink"];
    },
    GetImageUrl: async function (song) {
        let result = await Tools.Post({
            "url": "http://play.baidu.com/data/music/songinfo",
            "type": "json",
            "header": {
                'Host': 'play.baidu.com',
                'Origin': 'http://play.baidu.com'
            },
            "params": {
                songIds: song["params"]["songid"]
            }
        })
        //songPicSmall: 'http://musicdata.baidu.com/data2/pic/722499de80a73b5d44ed71c1d36f8972/265572262/265572262.jpg@s_0,w_90',
        //songPicBig: 'http://musicdata.baidu.com/data2/pic/722499de80a73b5d44ed71c1d36f8972/265572262/265572262.jpg@s_0,w_150',
        //songPicRadio: 'http://musicdata.baidu.com/data2/pic/722499de80a73b5d44ed71c1d36f8972/265572262/265572262.jpg@s_0,w_300',
        if (result.success) return result.data.data.songList[0]["songPicBig"];
        return "";
    },
    GetLyrics: async function (song) {
        return (await this.GetInfos(song))["lrcLink"];
    }

}