var Tools = require('../Tools');
var _ = require("underscore");
var Config = require('../../config');

var search_map = {
    "id": function (item) {
        return "kuwo:" + item["MUSICRID"];
    },
    "songname": "SONGNAME",
    "singername": "ARTIST",
    "albumname": "ALBUM",
    "params": function (item) {
        return {
            "MUSICRID": item["MUSICRID"],
            "musicId": item["MUSICRID"].replace("MUSIC_", "")
        }
    },
    "from": function () {
        return "Kuwo";
    }
}

module.exports = {
    Search: async function (key, page, limit) {
        let result = await Tools.Get({
            "url": 'http://search.kuwo.cn/r.s',
            "type": "text",
            "params": {
                "SONGNAME": key,
                "ft": "music",
                "rformat": "json",
                "encoding": "utf8",
                "pn": page || Config.default_page,
                "rn": limit || Config.default_limit,
                "vipver": "MUSIC_8.0.3.1",
                _: Date.now()
            }
        }).then(a => {
            var result;
            try {
                // text = a.data.replace(/^try \{var jsondata =/, "").replace(/;song\(jsondata\);\}catch\(e\)\{jsonError\(e\)\}/, "");
                result = eval("(" + a.data + ")").abslist;
            } catch (ex) {
                return [];
            }
            return Tools.ColumnMap(result || [], search_map);
        });
        return result;
    },
    GetInfos: async function (song) {
        //xml
        let result = await Tools.Get({
            "url": `http://player.kuwo.cn/webmusic/st/getNewMuiseByRid`,
            "type": "html",
            "loadcfg": {
                ignoreWhitespace: true,
                xmlMode: true
            },
            "params": {
                "rid": song["params"]["MUSICRID"]
            }
        });
        //<artist_pic>http://img3.kuwo.cn/star/starheads/120/3/24f2036d362862ec7530a2214d2b5a9_0.jpg</artist_pic>
        //<artist_pic240
        console.dir(result);
        if (result.success) {
            let $ = result.data;
            return {
                "artist_pic": $("artist_pic").text(),
                "artist_pic240": $("artist_pic240").text(),
                "lyric": $("lyric").text()
            };
        }
        return {
            "artist_pic": "",
            "artist_pic240": "",
            "lyric": ""
        };
    },
    GetPlayUrl: async function (song) {

        let result = await Tools.Get({
            "url": `http://antiserver.kuwo.cn/anti.s?`,
            "type": "text",
            "params": {
                type: "convert_url",
                response: "url",
                rid: song["params"]["MUSICRID"],
                format: "mp3"//aac|mp3
            }
        });
        return result.data || "";
    },
    GetImageUrl: async function (song) {
        return (await this.GetInfos(song))["artist_pic240"];
    },
    GetLyrics: async function (song) {
        let result = await Tools.Get({
            "url": `http://m.kuwo.cn/newh5/singles/songinfoandlrc`,
            "type": "json",
            "header": {
                'Host': 'm.kuwo.cn',
            },
            "params": {
                "musicId": song["params"]["musicId"]
            }
        });
        return result.data.data.lrclist || [];
    },
    GetTop: async function () {
        let result = await Tools.Get({
            "url": `http://www.kuwo.cn/bang/content`,
            "type": "html",
            "params": {
                "name": "酷我畅销榜"
            }
        }).then(a => {
            let $ = a.data,
                tr, data, result = [];

            $(".tools").each((i, e) => {
                tr = $(e);
                data = JSON.parse(tr.attr("data-music"));
                result.push({
                    "id": "kuwo:" + data.id,
                    "songname": data.name,
                    "singername": data.artist,
                    "albumname": data.album,
                    "params": {
                        "MUSICRID": data.id,
                        "musicId": data.id.replace("MUSIC_", "")
                    },
                    "from": "Kuwo"
                });
            })
            return result;
        });

        return result;

    }

}