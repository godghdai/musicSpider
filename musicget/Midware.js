const { Transform } = require('stream');
function isRedirect(code) {
    return ~[301, 302, 303, 305, 307, 308].indexOf(code);
}
module.exports = function (agent) {
    agent._pipeContinue = function (stream, options) {
        var self = this;
        this.req.once('response', function (res) {
            // redirect
            var redirect = isRedirect(res.statusCode);
            if (redirect && self._redirects++ != self._maxRedirects) {
                return self._redirect(res)._pipeContinue(stream, options);
            }
            self.res = res;
            self._emitResponse();
            if (self._aborted) return;

            if (self._shouldUnzip(res)) {
                res.pipe(zlib.createUnzip()).pipe(stream, options);
            } else {

                var getProgressMonitor = function () {

                    var total = +(self.res.headers['content-length'] || res.headers['Content-Length']);
                    var loaded = 0;
                    var progress = new Transform();
                    progress._transform = function (chunk, encoding, cb) {
                        loaded += chunk.length;
                        self.emit('progress', {
                            direction: 'download',
                            percent: (loaded / total * 100).toFixed(2),
                            loaded: loaded,
                            total: total,
                            path: self.req.path
                        });
                        cb(null, chunk);
                    };
                    return progress;
                };
                res.pipe(getProgressMonitor()).pipe(stream, options);
            }
            res.once('end', function () {
                self.emit("end");
            });
        });
        return stream;
    };
    /*
    if (agent instanceof request.Request) {
        agent.on('response', function (res) {
            var total = +(res.headers['content-length'] || res.headers['Content-Length']);
            var current = 0;
            console.dir(res.headers);
            res.on('data', function (e) {
                //current += e.length;
                //console.log("66total:" + total + "--now:" + current);
            });
        });
 
    }*/
}
