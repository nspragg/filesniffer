import _ from 'lodash';
import bluebird from 'bluebird';
import fs from 'fs';
import FileHound from 'FileHound';
import EventEmitter from 'events';
import byline from 'byline';
import path from 'path';
import isBinaryFile from './files';
import zlib from 'zlib';

const LineStream = require('byline').LineStream;

function stringMatch(data, string) {
  return data.indexOf(string) !== -1;
}

function regExpMatch(data, pattern) {
  return pattern.test(data);
}

function invalidInputSource(source) {
  return !(source instanceof FileHound) && !_.isString(source) && !_.isArray(source);
}

function from(_arguments) {
  const arg = _arguments[0];
  if (invalidInputSource(arg)) throw new Error('Invalid input source');

  if (arg instanceof FileHound || _.isArray(arg)) return arg;

  return Array.prototype.slice.call(_arguments);
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

class FileSniffer extends EventEmitter {
  constructor(args) {
    super();
    this._source = getSource(args);
    this.filenames = [];
    this.pending = 0;
    this.processed = 0;
    this._handleGzip = false;
  }

  _createStream(file) {
    if (this._handleGzip) {
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

  _createMatcher(pattern) {
    return _.isString(pattern) ? stringMatch : regExpMatch;
  }

  _notBinaryFile(file) {
    if (path.extname(file) === '.gz' && this._handleGzip) return true;

    return !isBinaryFile(file);
  }

  _groupByFileType(paths) {
    const dirs = [];
    const files = [];

    for (let i = 0; i < paths.length; i++) {
      try {
        isDirectory(paths[i]) ? dirs.push(paths[i]) : files.push(paths[i]);
      } catch (err) {
        this.emit('myerror', err);
      }
    }

    return {
      files: files,
      dirs: dirs
    };
  }

  _getFiles() {
    if (this._source instanceof FileHound) return this._source.find();

    if (_.isArray(this._source)) {
      const fileTypes = this._groupByFileType(this._source);
      const allFiles = bluebird.resolve(fileTypes.files);
      let allDirs = bluebird.resolve([]);

      if (fileTypes.dirs.length > 0) {
        allDirs = FileHound
          .create()
          .depth(0)
          .ignoreHiddenFiles()
          .paths(fileTypes.dirs)
          .find();
      }

      return bluebird.join(allFiles, allDirs, (a, b) => {
        return a.concat(b);
      });
    }
  }

  _search(file, pattern) {
    const snifferStream = this._createStream(file);
    const isMatch = this._createMatcher(pattern);

    let matched = false;
    snifferStream.on('readable', () => {
      let line;
      while (null !== (line = snifferStream.read())) {
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
      if (this.pending === 0) {
        this.emit('end', this.filenames);
      }
    });
  }

  gzip() {
    this._handleGzip = true;
    return this;
  }

  find(pattern) {
    const f = this._notBinaryFile.bind(this);

    this._getFiles()
      .filter(f)
      .then((files) => {
        this.pending = files.length;
        return files;
      })
      .each((file) => {
        this._search(file, pattern);
      });
  }

  static create() {
    return new FileSniffer(arguments);
  }
}

module.exports = FileSniffer;
