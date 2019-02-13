import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';

const BINARY_FILE_EXTENSIONS = require('../../extensions.json');

const binaryCharacters = [
  0, 1, 2, 3, 4,
  5, 6, 7, 8, 11,
  14, 15, 16, 17,
  18, 19, 20, 21,
  22, 23, 24, 25,
  26, 27, 28, 29,
  30, 31
];

const characters = new Buffer(512);
/* tslint:disable:no-increment-decrement */
for (let i = 0; i < characters.length; i++) {
  let isBinary = 0;
  if (_.includes(binaryCharacters, i)) {
    isBinary = 1;
  }
  characters[i] = isBinary;
}

function isBinaryChar(data) {
  return characters[data];
}

/* tslint:disable:function-name */
function _isbinary(data, size): boolean {
  const len = Math.min(size, 512);
  for (let i = 0; i < len; i++) {
    if (isBinaryChar(data[i])) { return true; }
  }
  return false;
}

function writeToBuffer(filename, buffer) {
  const fd = fs.openSync(filename, 'r');
  const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
  fs.closeSync(fd);

  return bytesRead;
}

function isBinaryData(filename): boolean {
  const bytes = new Buffer(512);
  const bytesRead = writeToBuffer(filename, bytes);
  return _isbinary(bytes, bytesRead);
}

export function isbinary(file: string): boolean {
  if (_.includes(BINARY_FILE_EXTENSIONS, path.extname(file))) { return true; }

  return isBinaryData(file);
}
