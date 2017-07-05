var Koa = require('koa');
var app = new Koa();
var cors = require('koa-cors');
var static = require('koa-static');
var convert = require('koa-convert');
var Router = require('koa-router');
var koaBody = require('koa-body');
var router = require('./musicget/Router');

app.use(koaBody());
router.use(app);
app.use(convert(cors()));
app.use(static(__dirname + '/ext-4.2.1.883'));
app.use(static(__dirname + '/public'));

var server = require('http').createServer(app.callback());
var io = require('socket.io')(server);
io.on('connection', function(socket) {
    router.socket(socket);
    socket.on('disconnect', function() {
        console.log('server disconnected');
    });
    console.dir("server connection.....");
});
server.listen(3000);
//app.listen(3000);
console.log('listening on port 3000');
let child_process = require('child_process'),
    openurl = 'http://localhost:3000/',
    cmd;

if (process.platform == 'win32') {
    cmd = 'start "%ProgramFiles%\Internet Explorer\iexplore.exe"';
} else if (process.platform == 'linux') {
    cmd = 'xdg-open';
} else if (process.platform == 'darwin') {
    cmd = 'open';
}

console.dir(process.platform);
child_process.exec(`${cmd} "${openurl}"`);