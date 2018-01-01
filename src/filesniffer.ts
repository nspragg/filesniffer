import * as _ from 'lodash';
import * as Promise from 'bluebird';
import * as fs from 'fs';
import * as filehound from 'filehound';
import { EventEmitter } from 'events';
import * as byline from 'byline';
import * as path from 'path';
import * as zlib from 'zlib';
import { isbinary } from './isbinary';
import bind from './bind';
import { ArrayCollector } from './ArrayCollector';
import { ObjectCollector } from './ObjectCollector';
import { NoopCollector } from './NoopCollector';
import { Collector } from './collector';
import { deprecate } from 'util';

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

export function asArray() {
  return new ArrayCollector();
}

export function asObject() {
  return new ObjectCollector();
}

export class FileSniffer extends EventEmitter {
  private inputSource;
  private filenames: string[];
  private pending: number;
  private gzipMode: boolean;
  private collector: Collector;
  private targets: string[];

  constructor(args) {
    super();
    this.inputSource = getSource(args);
    this.filenames = [];
    this.targets = [];
    this.pending = 0;
    this.gzipMode = false;
    this.collector = new NoopCollector();
    bind(this);
  }

  private createStream(file) {
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

  private createMatcher(pattern) {
    return _.isString(pattern) ? stringMatch : regExpMatch;
  }

  private handleGzip(file) {
    return path.extname(file) === '.gz' && this.gzipMode;
  }

  private nonBinaryFiles(file: string): boolean { // TODO: ignore binaries?
    if (this.handleGzip(file)) { return true; }
    return !isbinary(file);
  }

  private groupByFileType(paths) {
    const dirs = [];
    const files = [];

    /* tslint:disable:no-increment-decrement */
    for (let i = 0; i < paths.length; i++) {
      try {
        isDirectory(paths[i]) ? dirs.push(paths[i]) : files.push(paths[i]);
      } catch (err) {
        this.emit('error', err);
      }
    }

    return {
      files,
      dirs
    };
  }

  private getFiles(): Promise {
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

  private search(pattern): (files) => void {
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

  private searchFile(file, pattern): void {
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

          if (!(this.collector instanceof NoopCollector)) {
            this.collector.collect(line, { path: file });
          }
        }
      }
    });

    snifferStream.on('end', () => {
      /* tslint:disable:no-increment-decrement */
      this.pending--;
      this.emit('eof', file);
      if (matched) { this.filenames.push(file); }
      this.emitEnd();
    });
  }

  private emitEnd(): void {
    if (this.pending === 0) {
      this.emit('end', this.filenames);
    }
  }

  public gzip(): FileSniffer {
    this.gzipMode = true;
    return this;
  }

  public path(path): FileSniffer {
    this.targets.push(path);
    return this;
  }

  public find(pattern) {
    this.getFiles()
      .filter(this.nonBinaryFiles)
      .then(this.search(pattern));

    return new Promise((resolve, reject) => {
      this.on('end', () => {
        resolve(this.collector.matches());
      });
    });
  }

  public collect(collector: Collector): FileSniffer {
    this.collector = collector;
    return this;
  }

  public static create(): FileSniffer {
    return new FileSniffer(arguments);
  }
}
