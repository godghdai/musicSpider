var superagent = require('superagent');
var cheerio = require("cheerio");
var async = require('async');
var retries = require('./Retries');
var assert = require('assert');
var _ = require("underscore");
var fs = require('fs');
var middleware = require("./Midware");

var slice = Array.prototype.slice;

function shouldRetry(err, res) {
    return retries.some(function(check) {
        return check(err, res);
    });
}

function request(method, url, options) {
    var _type = "html";
    var _retry = {
        times: 3,
        interval: 1000
    };
    var _loadcfg = {};
    var _params = {};
    var _header = {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        'Proxy-Connection': 'keep-alive',
        'X-Anit-Forge-Code': '0',
        'X-Anit-Forge-Token': "None",
        'X-Requested-With': 'XMLHttpRequest'
    };

    if (_.isObject(url)) {
        assert(url.url, 'Tools.Get:url is required');
        Object.assign(_header, url["header"] || {});
        Object.assign(_retry, _.pick((url["retry"] || {}), 'times', 'interval'));
        _type = url["type"] || "text";
        _params = url["params"] || {};
        _loadcfg = url["loadcfg"] || {};
        url = url.url;

    }

    if (_.isObject(options)) {
        Object.assign(_header, options["header"] || {});
        Object.assign(_retry, _.pick((options["retry"] || {}), 'times', 'interval'));
        _type = options["type"] || "text";
        _loadcfg = options["loadcfg"] || {};
        _params = options["params"] || {};
    }

    _.each(_params, (value, key, list) => {
        if (_.isArray(value)) _params[key] = value.join(',');
    });

    return new Promise((resolve, reject) => {

        async.retry(_retry, function(retrycallback) {
                let req;;
                if (method == "get") {
                    req = superagent.get(url);
                    req.query(_params);
                } else {
                    req = superagent.post(url);
                    req.send(_params);
                }

                req.set(_header)
                    .buffer(true)
                    .end((err, res) => {
                        if (err) {
                            console.log("try....");
                            console.log(url);
                            console.log(err);
                            if (shouldRetry(err, res)) {
                                retrycallback({
                                    "success": false,
                                    "err": err
                                });
                            }
                            return;
                        }
                        try {
                            if (_type == "html") return retrycallback(null, {
                                "success": true,
                                "data": cheerio.load(res.text, _loadcfg)
                            });
                            if (_type == "json") return retrycallback(null, {
                                "success": true,
                                "data": JSON.parse(res.text || res.body)
                            });

                            retrycallback(null, {
                                "success": true,
                                "data": res.text || res.body
                            });
                        } catch (ex) {
                            retrycallback(null, {
                                "success": false,
                                "err": ex
                            });
                        }

                    });
            },
            function(err, result) {
                if (err) {
                    resolve(err);
                    return;
                }
                resolve(result);
            })

    });
}



module.exports = {
    Get: function() {
        return request.apply(null, ["get"].concat(slice.call(arguments)));
    },
    Post: function() {
        return request.apply(null, ["post"].concat(slice.call(arguments)));
    },
    download: function(options) {
        let _header = {};
        assert(options.url, 'options.url is required');
        assert(options.path, 'options.path is required');
        let url = options.url,
            path = options.path,
            progress = options.progress || function(e) {},
            data = options.data || {};
        Object.assign(_header, options["header"] || {});
        return new Promise((resolve, reject) => {
            superagent
                .get(url)
                .set(_header)
                .on('progress', event => {
                    event.data = data;
                    progress(event);
                })
                .use(middleware).pipe(fs.createWriteStream(path))
                .on('close', function() {
                    resolve({
                        url,
                        path,
                        "success": true
                    });
                }).on('error', function(err) {
                    reject({
                        url,
                        path,
                        "success": false,
                        "err": err
                    });
                });
        });
    },
    RunTasks: function(tasks, mapfun, limit) {
        limit = limit || 5;
        if (_.isArray(tasks) && _.isFunction(mapfun)) {
            return new Promise((resolve, reject) => {
                async.parallelLimit(tasks.map((task, index) => {
                        return function(callback) {
                            mapfun.call(null, task, callback);
                        }
                    }),
                    limit,
                    function(err, results) {
                        if (err) {
                            resolve({
                                "success": false,
                                "err": err
                            });
                            return;
                        }
                        resolve({
                            "success": true,
                            "data": results
                        });
                    });
            });
        }
        return Promise.resolve({
            "success": false,
            "err": "参数有误！！"
        });
    },
    ColumnMap: function(items, mapdic) {
        let result = [];
        if (_.isArray(items)) {

            return items.map(item => {
                let _item = {};
                _.map(mapdic, function(value, key) {
                    if (_.isFunction(value)) {
                        _item[key] = value(item);
                    } else {
                        _item[key] = item[value];
                    }
                });
                return _item;
            })

        }
        return result;
    }
}