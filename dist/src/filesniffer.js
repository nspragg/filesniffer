"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const Promise = require("bluebird");
const fs = require("fs");
const filehound = require("filehound");
const events_1 = require("events");
const byline = require("byline");
const path = require("path");
const zlib = require("zlib");
const isbinary_1 = require("./isbinary");
const bind_1 = require("./bind");
const ArrayCollector_1 = require("./ArrayCollector");
const ObjectCollector_1 = require("./ObjectCollector");
const NoopCollector_1 = require("./NoopCollector");
const LineStream = byline.LineStream;
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
function asArray() {
    return new ArrayCollector_1.ArrayCollector();
}
exports.asArray = asArray;
function asObject() {
    return new ObjectCollector_1.ObjectCollector();
}
exports.asObject = asObject;
class FileSniffer extends events_1.EventEmitter {
    constructor(args) {
        super();
        this.inputSource = getSource(args);
        this.filenames = [];
        this.targets = [];
        this.pending = 0;
        this.gzipMode = false;
        this.collector = new NoopCollector_1.NoopCollector();
        bind_1.default(this);
    }
    createStream(file) {
        if (this.handleGzip(file)) {
            const lineStream = new LineStream();
            fs.createReadStream(file)
                .pipe(zlib.createGunzip())
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
    nonBinaryFiles(file) {
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
        if (this.targets.length > 0) {
            const fileTypes = this.groupByFileType(this.targets);
            const allFiles = Promise.resolve(fileTypes.files);
            let allDirs = Promise.resolve([]);
            if (fileTypes.dirs.length > 0) {
                allDirs = filehound
                    .create()
                    .depth(0)
                    .ignoreHiddenFiles()
                    .paths(fileTypes.dirs)
                    .find();
            }
            return Promise.join(allFiles, allDirs, flatten);
        }
        // @depreciate
        if (_.isArray(this.inputSource)) {
            const fileTypes = this.groupByFileType(this.inputSource);
            const allFiles = Promise.resolve(fileTypes.files);
            let allDirs = Promise.resolve([]);
            if (fileTypes.dirs.length > 0) {
                allDirs = filehound
                    .create()
                    .depth(0)
                    .ignoreHiddenFiles()
                    .paths(fileTypes.dirs)
                    .find();
            }
            return Promise.join(allFiles, allDirs, flatten);
        }
    }
    search(pattern) {
        return (files) => {
            this.pending = files.length;
            if (this.pending > 0) {
                Promise.resolve(files).each((file) => {
                    this.searchFile(file, pattern);
                });
            }
            else {
                this.emitEnd();
            }
        };
    }
    searchFile(file, pattern) {
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
                    if (!(this.collector instanceof NoopCollector_1.NoopCollector)) {
                        this.collector.collect(line, { path: file });
                    }
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
            this.emitEnd();
        });
    }
    emitEnd() {
        if (this.pending === 0) {
            this.emit('end', this.filenames);
        }
    }
    gzip() {
        this.gzipMode = true;
        return this;
    }
    path(path) {
        this.targets.push(path);
        return this;
    }
    find(pattern) {
        this.getFiles()
            .filter(this.nonBinaryFiles)
            .then(this.search(pattern));
        return new Promise((resolve, reject) => {
            this.on('end', () => {
                resolve(this.collector.matches());
            });
        });
    }
    collect(collector) {
        this.collector = collector;
        return this;
    }
    static create() {
        return new FileSniffer(arguments);
    }
}
exports.FileSniffer = FileSniffer;
//# sourceMappingURL=filesniffer.js.map