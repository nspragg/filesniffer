import {
  assert
} from 'chai';

import binary from '../lib/binary';
import path from 'path';
import fs from 'fs';

// subset of extensions
const BINARY_FILES = qualifyNames([
  'binaryExtentions/a.pdf',
  'binaryExtentions/a.gz',
  'binaryExtentions/a.zip',
  'binaryExtentions/a.exe',
  'binaryExtentions/a.jpeg',
  'binaryExtentions/a.jpg',
  'binaryExtentions/a.jar',
  'binaryExtentions/a.iso',
  'binaryExtentions/a.flv',
  'binaryExtentions/a.mpg3',
  'binaryExtentions/a.mpg4',
  'binaryExtentions/a.mpg'
]);

const NON_BINARY_FILES = qualifyNames([
  'nonBinary/a.json',
  'nonBinary/a.txt',
  'nonBinary/a.sh'
]);

const EXTRACTED_ASCII = require('./fixtures/binary/ascii-extract');

function getAbsolutePath(file) {
  return path.join(__dirname + '/fixtures/', file);
}

function qualifyNames(names) {
  return names.map(getAbsolutePath);
}

describe('binary', () => {
  it('identifies binary files by file extention', () => {
    BINARY_FILES.forEach((file) => {
      assert.ok(binary.isBinaryFile(file), `file extension ${path.extname(file)} not matched`);
    });
  });

  it('returns false for non-binary file extensions', () => {
    NON_BINARY_FILES.forEach((file) => {
      assert.isNotOk(binary.isBinaryFile(file), 'PANTS!!!!!'); // TODO
    });
  });

  it('returns true for binary file content', () => {
    const f = getAbsolutePath('binary/binaryFile');
    assert.ok(binary.isBinaryFile(f));
  });

  it.only('extracts ascii text from a binary file', () => {
    const f = getAbsolutePath('binary/binaryFile');
    const contents = fs.readFileSync(f, 'utf8');
    const ascii = binary.strings(contents);
    assert.deepEqual(ascii, EXTRACTED_ASCII);
  });
});
