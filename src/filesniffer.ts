import * as _ from 'lodash';
import * as bluebird from 'bluebird';
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

const LineStream = byline.LineStream;

function stringMatch(data, str) {
  return data.indexOf(str) !== -1;
}

function regExpMatch(data, pattern) {
  return pattern.test(data);
}

function getStats(file) {
  return fs.statSync(file);
}

function isDirectory(file) {
  return getStats(file).isDirectory();
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

/** @class */
export class FileSniffer extends EventEmitter {
  private filenames: string[];
  private pending: number;
  private gzipMode: boolean;
  private collector: Collector;
  private targets: string[];
  private maxDepth: number;

  constructor() {
    super();
    this.filenames = [];
    this.targets = [];
    this.pending = 0;
    this.gzipMode = false;
    this.collector = new NoopCollector();
    this.maxDepth = 0;
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

  private handleGzip(file): boolean {
    return path.extname(file) === '.gz' && this.gzipMode;
  }

  private nonBinaryFiles(file: string): boolean {
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

  private getFiles(): bluebird<string[]> {
    if (this.targets.length === 0) {
      this.targets = [process.cwd()];
    }
    const fileTypes = this.groupByFileType(this.targets);
    const allFiles = Promise.resolve(fileTypes.files);
    let allDirs = Promise.resolve([]);
    if (fileTypes.dirs.length > 0) {
      allDirs = filehound
        .create()
        .depth(this.maxDepth)
        .ignoreHiddenFiles()
        .paths(fileTypes.dirs)
        .find();
    }
    return bluebird.join(allFiles, allDirs, flatten);
  }

  private search(pattern): (files) => void {
    return (files) => {
      this.pending = files.length;
      if (this.pending > 0) {
        bluebird.resolve(files).each((file) => {
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

  // tslint:disable-next-line:valid-jsdoc
  /**
   * Enables FileSniffer to search gzipped files
   *
   * @memberOf FileSniffer
   * @method
   * gzip
   * @param none
   * @return a FileSniffer instance
   * @example
   * import FileSniffer from 'FileSniffer';
   *
   * const sniffer = FileSniffer.create()
   *   .gzip()
   *   .collect(asArray())
   *   .find('str');
   */
  public gzip(): FileSniffer {
    this.gzipMode = true;
    return this;
  }

  // tslint:disable-next-line:valid-jsdoc
  /**
   * Set the search path for FileSniffer - file or directory
   *
   * @memberOf FileSniffer
   * @method
   * path
   * @param {string} path - search path
   * @return a FileSniffer instance
   * @example
   * import FileSniffer from 'FileSniffer';
   *
   * const sniffer = FileSniffer.create()
   *   .path(someFile)
   *   .collect(asArray())
   *   .find('str');
   */
  public path(path): FileSniffer {
    this.targets.push(path);
    return this;
  }

  // tslint:disable-next-line:valid-jsdoc
  /**
   * Enables FileSniffer to search recursively
   *
   * @memberOf FileSniffer
   * @method
   * path
   * @param {string} path - path of file (or directory) to search
   * @return a FileSniffer instance
   * @example
   * import FileSniffer from 'FileSniffer';
   *
   * const sniffer = FileSniffer.create()
   *   .path(someFile)
   *   .collect(asArray())
   *   .find('str');
   */
  public depth(maxDepth): FileSniffer {
    if (maxDepth < 0) {
      throw new Error('Depth must be >= 0');
    }

    this.maxDepth = maxDepth;
    return this;
  }

  // tslint:disable-next-line:valid-jsdoc
  /**
   * Set the search paths for FileSniffer - can be a mixture of file and directories
   *
   * @memberOf FileSniffer
   * @method
   * paths
   * @param {string} paths - search paths
   * @return a FileSniffer instance
   * @example
   * import FileSniffer from 'FileSniffer';
   *
   * const sniffer = FileSniffer.create()
   *   .paths(arrayOfPaths)
   *   .collect(asArray())
   *   .find('str');
   */
  public paths(...paths): FileSniffer {
    if (typeof paths[0] !== 'string' && !_.isArray(paths[0])) {
      throw new TypeError('paths must be an array');
    }

    this.targets = _.flatten(paths);
    return this;
  }

  // tslint:disable-next-line:valid-jsdoc
  /**
   * Set the search paths for FileSniffer - can be a mixture of file and directories
   *
   * @memberOf FileSniffer
   * @method
   * find
   * @param {string|pattern}  - search criteria
   * @return a promise of matches
   * @example
   * import FileSniffer from 'FileSniffer';
   *
   * const matches = await FileSniffer.create()
   *   .collect(asArray())
   *   .find('str');
   */
  public find(pattern): Promise<any> {
    if (!pattern) {
      return Promise.reject(new Error('Search string or pattern must be specified'));
    }

    const search = this.getFiles()
      .filter(this.nonBinaryFiles)
      .then(this.search(pattern));

    return search.then(() => {
      return new Promise((resolve, reject) => {
        this.on('end', () => {
          resolve(this.collector.matches());
        });
      });
    });
  }

  // tslint:disable-next-line:valid-jsdoc
  /**
   * Sets the collector 
   *
   * @memberOf FileSniffer
   * @method
   * collect
   * @param {Collector}  - logic to collect matching lines
   * @return a FileSniffer instance
   * @example
   * import FileSniffer from 'FileSniffer';
   *
   * const matches = await FileSniffer.create()
   *   .collect(asObject())
   *   .find('str');
   */
  public collect(collector: Collector): FileSniffer {
    this.collector = collector;
    return this;
  }

  // tslint:disable-next-line:valid-jsdoc
  /**
   * Static factory method to create an instance of FileSniffer
   *
   * @static
   * @memberOf FileSniffer
   * @method
   * create
   * @return FileSniffer instance
   * @example
   * import FileSniffer from 'filesniffer';
   *
   * const FileSniffer = FileSniffer.create();
   */
  public static create(): FileSniffer {
    return new FileSniffer();
  }
}
