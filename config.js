var path = require('path');
var fs = require('fs');
/*
var musicLibs = {};
fs.readdirSync(path.join(__dirname, "musicget", "libs")).forEach((file) => {
    musicLibs[path.basename(file, ".js")] = require(`./musicget/libs/${file}`);
})
*/
//console.dir(musicLibs);
module.exports = {
    default_page: 1,
    default_limit: 5,
    default_download_path: path.resolve(__dirname, "./downloads"), //下载路径
    default_download_limit: 3 //最大同时下载数

}