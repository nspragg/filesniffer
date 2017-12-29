"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const bluebird = require("bluebird");
const fs = require("fs");
const filehound = require("filehound");
const events_1 = require("events");
const byline = require("byline");
const path = require("path");
const isbinary_1 = require("./isbinary");
const zlib = require("zlib");
const LineStream = require('byline').LineStream;
function stringMatch(data, str) {
    return data.indexOf(str) !== -1;
}
function regExpMatch(data, pattern) {
    return pattern.test(data);
}
function invalidInputSource(source) {
    return !(source instanceof filehound) && !_.isString(source) && !_.isArray(source);
}
function from(args) {
    const arg = args[0];
    if (invalidInputSource(arg)) {
        throw new Error('Invalid input source');
    }
    if (arg instanceof filehound || _.isArray(arg)) {
        return arg;
    }
    return Array.prototype.slice.call(args);
}
function getStats(file) {
    return fs.statSync(file);
}
function isDirectory(file) {
    return getStats(file).isDirectory();
}
function getSource(args) {
    return args.length === 0 ? [process.cwd()] : from(arguments[0]);
}
function flatten(a, b) {
    return a.concat(b);
}
class FileSniffer extends events_1.EventEmitter {
    constructor(args) {
        super();
        this.inputSource = getSource(args);
        this.filenames = [];
        this.pending = 0;
        this.gzipMode = false;
    }
    createStream(file) {
        if (this.handleGzip(file)) {
            const fstream = fs.createReadStream(file);
            const unzipStream = zlib.createGunzip();
            const lineStream = new LineStream();
            fstream
                .pipe(unzipStream)
                .pipe(lineStream);
            return lineStream;
        }
        return byline(fs.createReadStream(file, {
            encoding: 'utf-8'
        }));
    }
    createMatcher(pattern) {
        return _.isString(pattern) ? stringMatch : regExpMatch;
    }
    handleGzip(file) {
        return path.extname(file) === '.gz' && this.gzipMode;
    }
    notBinaryFile(file) {
        if (this.handleGzip(file)) {
            return true;
        }
        return !isbinary_1.isbinary(file);
    }
    groupByFileType(paths) {
        const dirs = [];
        const files = [];
        /* tslint:disable:no-increment-decrement */
        for (let i = 0; i < paths.length; i++) {
            try {
                isDirectory(paths[i]) ? dirs.push(paths[i]) : files.push(paths[i]);
            }
            catch (err) {
                this.emit('error', err);
            }
        }
        return {
            files,
            dirs
        };
    }
    getFiles() {
        if (this.inputSource instanceof filehound) {
            return this.inputSource.find();
        }
        if (_.isArray(this.inputSource)) {
            const fileTypes = this.groupByFileType(this.inputSource);
            const allFiles = bluebird.resolve(fileTypes.files);
            let allDirs = bluebird.resolve([]);
            if (fileTypes.dirs.length > 0) {
                allDirs = filehound
                    .create()
                    .depth(0) // TODO - add method for recursion 
                    .ignoreHiddenFiles()
                    .paths(fileTypes.dirs)
                    .find();
            }
            return bluebird.join(allFiles, allDirs, flatten);
        }
    }
    search(file, pattern) {
        const snifferStream = this.createStream(file);
        const isMatch = this.createMatcher(pattern);
        let matched = false;
        snifferStream.on('readable', () => {
            let line;
            /* tslint:disable:no-conditional-assignment */
            while (null !== (line = snifferStream.read())) {
                if (line instanceof Buffer) {
                    line = line.toString('utf8');
                }
                if (isMatch(line, pattern)) {
                    matched = true;
                    this.emit('match', file, line);
                }
            }
        });
        snifferStream.on('end', () => {
            /* tslint:disable:no-increment-decrement */
            this.pending--;
            this.emit('eof', file);
            if (matched) {
                this.filenames.push(file);
            }
            if (this.pending === 0) {
                this.emit('end', this.filenames);
            }
        });
    }
    gzip() {
        this.gzipMode = true;
        return this;
    }
    find(pattern) {
        const notBinaryFile = this.notBinaryFile.bind(this);
        this.getFiles()
            .filter(notBinaryFile)
            .then((files) => {
            this.pending = files.length;
            return files;
        })
            .each((file) => {
            this.search(file, pattern);
        });
    }
    static create() {
        return new FileSniffer(arguments);
    }
}
exports.FileSniffer = FileSniffer;
//# sourceMappingURL=filesniffer.js.map