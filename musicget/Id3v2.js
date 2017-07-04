//https://www.blackglory.me/node-js-id3v2-3-standard-tag-write-test-code/
var fs = require('fs');
var bin, dec2bin, fs, hex, isArray, prefixInteger, split;

String.prototype.times = function(n) {
    return Array.prototype.join.call({
        length: n + 1
    }, this);
};

split = function(str, len) {
    var chunks, pos, temp;
    chunks = [];
    pos = str.length;
    while (pos > 0) {
        temp = pos - len > 0 ? pos - len : 0;
        chunks.unshift(str.slice(temp, pos));
        pos = temp;
    }
    return chunks;
};

prefixInteger = function(num, length) {
    return (num / Math.pow(10, length)).toFixed(length).substr(2);
};

isArray = function(input) {
    return typeof input === 'object' && input instanceof Array;
};

hex = function(input) {
    if (isArray(input)) {
        return String.fromCharCode.apply(this, input);
    } else {
        return String.fromCharCode(input);
    }
};

bin = function(input) {
    var i;
    if (isArray(input)) {
        return String.fromCharCode.apply(this, (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = input.length; _i < _len; _i++) {
                i = input[_i];
                _results.push(parseInt(i, 2));
            }
            return _results;
        })());
    } else {
        return String.fromCharCode(parseInt(input, 2));
    }
};

dec2bin = function(input, len) {
    var i;
    if (len == null) {
        len = 8;
    }
    return bin((function() {
        var _i, _len, _ref, _results;
        _ref = split(input.toString(2), len);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            i = _ref[_i];
            _results.push(prefixInteger(i, 8));
        }
        return _results;
    })());
};


function id3v23(filename, tags) {
    this.filename = filename;
    this.tags = tags != null ? tags : {};
}

id3v23.prototype.setTag = function(key, value) {
    return this.tags[key] = value;
};

id3v23.prototype.write = function(cb) {
    var blankLength, bom, fd, frame, frameData, frameFlags, frameId, frameSize, frames, framesLength, header, headerFileIdentifier, headerFlags, headerSize, headerVersion, oldData, pic, pure, tag, type, value, _i, _j, _len, _len1, _ref;
    oldData = fs.readFileSync(this.filename);
    fd = fs.openSync(this.filename, 'w+');
    /*
        标签头 固定为10个字节
        顺序 Identifier(3) Version(2) Flags(1) Size(4)
    */

    header = new Buffer(10);
    headerFileIdentifier = 'ID3';
    headerVersion = hex([0x03, 0x00]);
    headerFlags = bin('00000000');
    /*
        帧
        顺序 Id(4) Size(4) Flags(2) Data(?)
        Id + Size + Flags 共10个字节
        Size为帧的总大小-10, 即Data的大小
    */

    frames = [];
    _ref = this.tags;
    for (tag in _ref) {
        value = _ref[tag];
        pure = !isNaN(value);
        pic = Buffer.isBuffer(value);
        frameId = tag;
        frameFlags = bin(['00000000', '00000000']);
        if (pic) {
            type = 'image/jpeg' + hex([0x00, 0x00, 0x00]);
            frameData = new Buffer(type.length + value.length);
            frameData.write(type, 0, type.length);
            value.copy(frameData, type.length);
        } else {
            frameData = value;
        }
        if (pure || pic) {
            bom = hex([0x00]);
            frameSize = dec2bin(frameData.length + bom.length);
            frame = new Buffer(10 + frameData.length + bom.length);
        } else {
            bom = hex([0x01, 0xFF, 0xFE]);
            frameSize = dec2bin(frameData.length * 2 + bom.length);
            frame = new Buffer(10 + frameData.length * 2 + bom.length);
        }
        frame.write(frameId, 0, 4, 'utf8');
        blankLength = 4 - frameSize.length;
        frame.write(hex([0x00]).times(blankLength), 4, blankLength, 'utf8');
        frame.write(frameSize, 4 + blankLength, frameSize.length, 'ascii');
        frame.write(frameFlags, 8, 2, 'utf8');
        if (pure || pic) {
            frame.write(bom, 10, bom.length, 'utf8');
            if (pic) {
                frameData.copy(frame, 10 + bom.length);
            } else {
                frame.write(frameData, 10 + bom.length, frameData.length, 'ascii');
            }
        } else {
            frame.write(bom, 10, bom.length, 'ascii');
            frame.write(frameData, 10 + bom.length, frameData.length * 2, 'ucs2');
        }
        frames.push(frame);
    }
    framesLength = 0;
    for (_i = 0, _len = frames.length; _i < _len; _i++) {
        frame = frames[_i];
        framesLength += frame.length;
    }
    headerSize = dec2bin(framesLength + 10 - 1, 7);
    header.write(headerFileIdentifier + headerVersion + headerFlags);
    blankLength = 4 - headerSize.length;
    header.write(hex([0x00]).times(blankLength), 6, blankLength, 'utf8');
    header.write(headerSize, 6 + blankLength, 10, 'ascii');
    fs.writeSync(fd, header, 0, header.length, 0);
    for (_j = 0, _len1 = frames.length; _j < _len1; _j++) {
        frame = frames[_j];
        fs.writeSync(fd, frame, 0, frame.length);
    }
    fs.writeSync(fd, new Buffer(new Array(800)), 0, 800);
    fs.writeSync(fd, oldData, 0, oldData.length);
    return fs.closeSync(fd);
};

/* FrameID标志内容 
 *  
 * TEXT： 歌词作者       TENC： 编码            WXXX： URL链接(URL)            TCOP： 版权(Copyright)     TOPE： 原艺术家  
 * TCOM： 作曲家        TDAT： 日期            TPE3： 指挥者               TPE2： 乐队                    TPE1： 艺术家相当于ID3v1的Artist  
 * TPE4： 翻译（记录员、修改员）            TYER： 即ID3v1的Year       USLT： 歌词                    TSIZ： 大小 
 * TALB： 专辑相当于ID3v1的Album           TIT1： 内容组描述         TIT2： 标题相当于ID3v1的Title  
 * TIT3： 副标题        TCON： 流派（风格）相当于ID3v1的Genre          AENC： 音频加密技术            TSSE： 编码使用的软件（硬件设置） 
 * TBPM： 每分钟节拍数 COMM： 注释相当于ID3v1的Comment                    TDLY： 播放列表返录            TRCK： 音轨（曲号）相当于ID3v1的Track  
 * TFLT： 文件类型       TIME： 时间　       TKEY： 最初关键字         TLAN： 语言                    TLEN： 长度         
 * TMED： 媒体类型       TOAL： 原唱片集      TOFN： 原文件名              TOLY： 原歌词作者         TORY： 最初发行年份  
 * TOWM： 文件所有者（许可证者）            TPOS： 作品集部分         TPUB： 发行人               TRDA： 录制日期  
 * TRSN： Intenet电台名称                    TRSO： Intenet电台所有者  UFID： 唯一的文件标识符 　    TSRC： ISRC（国际的标准记录代码

module.exports = function (filepath, tags) {
    let writer = new id3v23('后来的我们_五月天.mp3');
    writer.setTag('TIT2', 'TIT2');//标题
    writer.setTag('TPE1', 'TPE1');//艺术家
    writer.setTag('TALB', 'TALB');//唱片集
    //writer.setTag('TRCK', '8');
   // writer.setTag('TYER', '2013');
    writer.setTag('APIC', fs.readFileSync('test.jpg'));
    console.time('Encode & Write');
    writer.write();
    console.timeEnd('Encode & Write');
}
*/
module.exports = id3v23;