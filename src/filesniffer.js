import _ from 'lodash';
import Promise from 'bluebird';
import fs from 'fs';
import FileHound from 'filehound';
import { EventEmitter } from 'events';
import byline from 'byline';
import path from 'path';
import zlib from 'zlib';
import isBinaryFile from './binary';
import bind from './bind';

const LineStream = byline.LineStream;

function stringMatch(data, string) {
  return data.indexOf(string) !== -1;
}

function regExpMatch(data, pattern) {
  return pattern.test(data);
}

function invalidInputSource(source) {
  return !(source instanceof FileHound) && !_.isString(source) && !_.isArray(source);
}

function from(args) {
  const arg = args[0];

  if (invalidInputSource(arg)) {
    throw new Error('Invalid input source');
  }

  if (arg instanceof FileHound || _.isArray(arg)) {
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

class FileSniffer extends EventEmitter {
  constructor(args) {
    super();
    this.inputSource = getSource(args);
    this.filenames = [];
    this.pending = 0;
    this.gzipMode = false;
    bind(this);
  }

  _createStream(file) {
    if (this._handleGzip(file)) {
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

  _createMatcher(pattern) {
    return _.isString(pattern) ? stringMatch : regExpMatch;
  }

  _handleGzip(file) {
    return path.extname(file) === '.gz' && this.gzipMode;
  }

  _nonBinaryFiles(file) {
    if (this._handleGzip(file)) return true;
    return !isBinaryFile(file);
  }

  _groupByFileType(paths) {
    const dirs = [];
    const files = [];

    for (let i = 0; i < paths.length; i++) {
      try {
        isDirectory(paths[i]) ? dirs.push(paths[i]) : files.push(paths[i]);
      } catch (err) {
        this.emit('error', err);
      }
    }

    return {
      files: files,
      dirs: dirs
    };
  }

  _getFiles() {
    if (this.inputSource instanceof FileHound) return this.inputSource.find();

    if (_.isArray(this.inputSource)) {
      const fileTypes = this._groupByFileType(this.inputSource);
      const allFiles = Promise.resolve(fileTypes.files);
      let allDirs = Promise.resolve([]);

      if (fileTypes.dirs.length > 0) {
        allDirs = FileHound
          .create()
          .depth(0)
          .ignoreHiddenFiles()
          .paths(fileTypes.dirs)
          .find();
      }

      return Promise.join(allFiles, allDirs, flatten);
    }
  }

  _search(pattern) {
    return (files) => {
      this.pending = files.length;
      if (this.pending > 0) {
        Promise.resolve(files).each((file) => {
          this._searchFile(file, pattern);
        });
      }
      else {
        this._emitEnd();
      }
    };
  }

  _searchFile(file, pattern) {
    const snifferStream = this._createStream(file);
    const isMatch = this._createMatcher(pattern);

    let matched = false;
    snifferStream.on('readable', () => {
      let line;
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
      this.pending--;
      this.emit('eof', file);
      if (matched) this.filenames.push(file);
      this._emitEnd();
    });
  }

  _emitEnd() {
    if (this.pending === 0) {
      this.emit('end', this.filenames);
    }
  }

  gzip() {
    this.gzipMode = true;
    return this;
  }

  find(pattern) {
    const nonBinaryFiles = this._nonBinaryFiles.bind(this);

    this._getFiles()
      .filter(nonBinaryFiles)
      .then(this._search(pattern));
  }

  static create() {
    return new FileSniffer(arguments);
  }
}

module.exports = FileSniffer;
