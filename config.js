var path = require('path');
var fs = require('fs');
module.exports = {
    default_page: 1,
    default_limit: 5,
    default_download_path: path.resolve(__dirname, "./downloads"), //下载路径
    default_download_limit: 3 //最大同时下载数

}