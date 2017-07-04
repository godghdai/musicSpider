var Tools = require('../Tools');
var _ = require("underscore");
var Config = require('../../config');
var {
    URLSearchParams
} = require('url');
var _header = {
    'Host': 'music.migu.cn',
    'Referer': 'http://music.migu.cn/'
        //'Upgrade-Insecure-Requests':1,
        //"Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
        //'Referer': 'http://music.migu.cn/'
};

module.exports = {
    Search: async function(key, page, limit) {
        console.dir(Config);
        let result = await Tools.Get({
            "url": "http://music.migu.cn/webfront/searchNew/searchAll.do",
            "type": "html",
            "header": _header,
            "params": {
                "keyword": key,
                "keytype": "song",
                "pagesize": limit || Config.default_limit,
                "pagenum": page || Config.default_page
            }
        });
        if (result.success) {
            let $ = result.data;
            let data = [],
                li, tool, params;
            $(".search_songlist li").each((i, e) => {
                li = $(e);
                tool = li.find(".icon_tools");
                params = new URLSearchParams(tool.attr("data_log"));
                data.push({
                    "id": "migu:" + tool.attr("itemid"),
                    "songname": li.find(".song_name").text().replace(/\n|\t| /g, ''),
                    "singername": li.find(".singer_name").text().replace(/\n|\t| /g, ''),
                    "albumname": li.find(".song_album").text().replace(/\n|\t| /g, ''),
                    "params": {
                        "itemid": tool.attr("itemid"),
                        "loc": params.get('loc'),
                        "locno": params.get('locno'),
                        "cid": params.get('cid')
                    },
                    "from": "Migu"
                });
            })
            return data;
        }
        return [];

    },
    GetPlayUrl: async function(song) {
        let result = await Tools.Get({
            "url": "http://music.migu.cn/webfront/player/findsong.do",
            "type": "json",
            "header": _header,
            "params": {
                "itemid": song["params"]["itemid"],
                "type": "song",
                "loc": song["params"]["loc"],
                "locno": song["params"]["locno"],
                "cid": song["params"]["cid"]
            }
        });
        /*
        { cmp3: 'http://tyst.migu.cn/public/ringmaker01/n16/2016/11/2015年07月10日东亚词曲预留内容准入89首/彩铃/6_mp3-128kbps/中国人-刘德华.mp3?msisdn=f8f4fafbb4f4',
          copyright_id: '63390505184',
          hdmp3: 'http://tyst.migu.cn/public/ringmaker01/n16/2016/11/2015年07月10日东亚词曲预留内容准入89首/全曲试听/Mp3_320_44_16/中国人-刘德华.mp3?msisdn=f0ecc9df9915',
          mp3: 'http://tyst.migu.cn/public/ringmaker01/n16/2016/11/2015年07月10日东亚词曲预留内容准入89首/全曲试听/Mp3_128_44_16/中国人-刘德华.mp3?msisdn=51e63bf4b054',
          mp4: 'http://tyst.migu.cn/public/ringmaker01/n16/2016/11/2015年07月10日东亚词曲预留内容准入89首/杜比/mp4_128/中国人-刘德华.mp4?msisdn=918ad431b8f5',
          poster: 'http://img01.12530.com/res/images/default1.jpg_RsT_200x200.jpg',
          singerId: '955293',
          singerName: '刘德华',
          songId: '8422',
          songName: '%E4%B8%AD%E5%9B%BD%E4%BA%BA' }
        */
        return result.data.msg[0]["mp3"];
    },
    GetImageUrl: async function(song) {
        return "http://img01.12530.com/res/images/default1.jpg_RsT_200x200.jpg";
    },
    GetLyrics: async function(song) {

        let result = await Tools.Get({
            "url": "http://music.migu.cn/webfront/player/lyrics.do",
            "type": "json",
            "header": _header,
            "params": {
                "songid": song["params"]["itemid"]
            }
        });
        return result.data;

    }

}