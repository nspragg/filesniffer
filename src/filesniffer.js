import _ from 'lodash';
import bluebird from 'bluebird';
import fs from 'fs';
import FileHound from 'FileHound';
import EventEmitter from 'events';
import byline from 'byline';
import isBinaryFile from './files';

const fsp = bluebird.promisifyAll(fs);

function stringMatch(data, string) {
  return data.indexOf(string) !== -1;
}

function regExpMatch(data, pattern) {
  return pattern.test(data);
}

function notBinaryFile(file) {
  return !isBinaryFile(file);
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

function _groupByFileType(paths) {
  const dirs = [];
  const files = [];

  for (let i = 0; i < paths.length; i++) {
    isDirectory(paths[i]) ? dirs.push(paths[i]) : files.push(paths[i]);
  }

  return {
    files: files,
    dirs: dirs
  };
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
  }

  _createStream(file) {
    return byline(fs.createReadStream(file, {
      encoding: 'utf-8'
    }));
  }

  _createMatcher(pattern) {
    return _.isString(pattern) ? stringMatch : regExpMatch;
  }

  _getFiles() {
    if (this._source instanceof FileHound) return this._source.find();

    if (_.isArray(this._source)) {
      const fileTypes = _groupByFileType(this._source);
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
        this.emit('done', this.filenames);
      }
    });
  }

  find(pattern) {
    this._getFiles()
      .filter(notBinaryFile)
      .then((files) => {
        this.pending = files.length;
        return files;
      })
      .each((file) => {
        this._search(file, pattern);
      });

    return this;
  }

  static create() {
    return new FileSniffer(arguments);
  }
}

module.exports = FileSniffer;
