import _ from 'lodash';
import assert from 'assert';
import assert2 from 'chai';
import sinon from 'sinon';
import path from 'path';
import FileHound from 'FileHound';
import FileSniffer from '../lib/filesniffer';

const fileList = qualifyNames(['list/a.txt', 'list/b.txt', 'list/c.txt']);
const hidden = qualifyNames(['listWithHidden/a.txt']);
const nestedList = qualifyNames(['nested/d.txt', 'nested/e.txt', 'nested/f.txt']);
const matchingList = qualifyNames(['match/lorem-ipsum.txt']);
const binaryList = qualifyNames(['binary/binaryFile']);

function getAbsolutePath(file) {
  return path.join(__dirname + '/fixtures/', file);
}

function qualifyNames(names) {
  return names.map(getAbsolutePath);
}

describe('FileSniffer', () => {
  describe('.create', () => {
    it('searches a given directory', (done) => {
      const expected = [nestedList[0]];
      const searchDirectory = __dirname + '/fixtures/nested';

      const sniffer = FileSniffer
        .create(searchDirectory)
        .find(/^p/i);

      sniffer.on('done', (filenames) => {
        assert.deepEqual(filenames, expected);
        done();
      });
    });

    it('searches a given file', (done) => {
      const expected = [nestedList[0]];
      const fileToSearch = nestedList[0];

      const sniffer = FileSniffer
        .create(fileToSearch)
        .find(/^p/i);

      sniffer.on('done', (filenames) => {
        assert.deepEqual(filenames, expected);
        done();
      });
    });

    it('uses the current working directory as the default search path', (done) => {
      const expected = process.cwd() + '/' + 'README.md';
      const sniffer = FileSniffer
        .create()
        .find(/^p/i);

      sniffer.on('done', (filenames) => {
        assert.ok(_.includes(filenames, expected));
        done();
      });
    });

    it('supports variable arguments', (done) => {
      const expected = [nestedList[1], nestedList[2]];

      const sniffer = FileSniffer
        .create(nestedList[1], nestedList[2])
        .find(/^f/i);

      sniffer.on('done', (filenames) => {
        assert.deepEqual(filenames, expected);
        done();
      });
    });

    it('throws an error when given an invalid input source', () => {
      assert.throws(function () {
        const sniffer = FileSniffer.create({});
      }, /Invalid input source/);
    });

    it('returns files from a given FileHound instance that contains a matching patten', () => {
      const expected = [fileList[0], fileList[2]];
      const criteria = FileHound
        .create()
        .paths(__dirname + '/fixtures/list')
        .ext('txt');

      const sniffer = FileSniffer
        .create(criteria)
        .find(/^f/i);

      sniffer.on('done', (files) => {
        assert.deepEqual(files, expected);
      });
    });
  });

  describe('.find', () => {
    it('returns files from a given list that contains a given string', (done) => {
      const expected = [fileList[1]];

      const sniffer = FileSniffer
        .create(fileList)
        .find('passed');

      sniffer.on('done', (filenames) => {
        assert.deepEqual(filenames, expected);
        done();
      });
    });

    it('returns files from a given list that contains a pattern', (done) => {
      const expected = [fileList[0], fileList[2]];

      const sniffer = FileSniffer
        .create(fileList)
        .find(/^f/i);

      sniffer.on('done', (filenames) => {
        assert.deepEqual(filenames, expected);
        done();
      });
    });

    it('emits the filename', (done) => {
      const expected = [fileList[1]];
      const sniffer = FileSniffer
        .create(fileList)
        .find(/^passed/);

      sniffer.on('match', (filename) => {
        assert.equal(filename, expected);
        done();
      });
    });

    it('emits eof event when a file has been read', (done) => {
      const expected = fileList[0];
      const sniffer = FileSniffer
        .create([fileList[0]])
        .find(/Nullam/);

      sniffer.on('eof', (filename) => {
        assert.equal(filename, expected);
        done();
      });
    });

    it('emits a done event with all matching filenames', (done) => {
      const sniffer = FileSniffer
        .create(matchingList)
        .find(/Nullam/);

      sniffer.on('done', (filenames) => {
        assert.deepEqual(filenames, matchingList);
        done();
      });
    });

    it('emits all matching lines as match events', (done) => {
      const match1 = 'Nullam rhoncus nisl et tellus molestie tincidunt.';
      const match2 = 'In sit amet viverra leo. Donec sodales metus erat. Nullam consequat dui vel pretium auctor.';
      const match3 = 'lobortis sem. Proin bibendum ex at purus ornare faucibus. Nullam semper ligula vel quam aliquam,';

      const sniffer = FileSniffer
        .create(matchingList)
        .find(/Nullam/);

      const spy = sinon.spy();
      sniffer.on('match', spy);

      sniffer.on('eof', (filename) => {
        sinon.assert.callCount(spy, 3);
        sinon.assert.calledWithMatch(spy, 'lorem-ipsum.txt', match1);
        sinon.assert.calledWithMatch(spy, 'lorem-ipsum.txt', match2);
        sinon.assert.calledWithMatch(spy, 'lorem-ipsum.txt', match3);
        done();
      });
    });

    it('ignores binary files by default', (done) => {
      const expected = [fileList[0], fileList[2]];

      const sniffer = FileSniffer
        .create(expected.concat(binaryList))
        .find(/^f/i);

      const spy = sinon.spy();
      sniffer.on('eof', spy);

      sniffer.on('done', () => {
        sinon.assert.callCount(spy, 2);
        sinon.assert.calledWithMatch(spy, 'a.txt');
        sinon.assert.calledWithMatch(spy, 'c.txt');
        done();
      });
    });

    it('ignores hidden files', (done) => {
      const expected = [hidden[0]];
      const searchDirectory = __dirname + '/fixtures/listWithHidden';

      const sniffer = FileSniffer
        .create(searchDirectory)
        .find(/^passed/);

      sniffer.on('done', (filenames) => {
        assert.deepEqual(filenames, expected);
        done();
      });
    });
  });
});
