import { assert } from 'chai';
import * as sinon from 'sinon';
import * as path from 'path';
import { FileSniffer, asArray, asObject } from '../dist/src/filesniffer';

const fileList = qualifyNames(['list/a.txt', 'list/b.txt', 'list/c.txt']);
const gzipped = qualifyNames(['gzipped']);
const hidden = qualifyNames(['listWithHidden/a.txt']);
const nestedList = qualifyNames(['nested/d.txt', 'nested/e.txt', 'nested/f.txt']);
const matchingList = qualifyNames(['match/lorem-ipsum.txt', 'match/multiple.txt']);
const binaryList = qualifyNames(['binary/binaryFile']);

function getAbsolutePath(file) {
  return path.join(__dirname + '/fixtures/', file);
}

function qualifyNames(names) {
  return names.map(getAbsolutePath);
}

function mockMatchEvent(sniffer, event = 'match') {
  const spy = sinon.spy();
  sniffer.on(event, spy);

  return spy;
}

describe('FileSniffer', () => {
  describe('.create', () => {
    it('uses the current working directory as the default search path', (done) => {
      const expected = process.cwd() + '/' + 'README.md';
      const sniffer = FileSniffer.create();
      const spy = mockMatchEvent(sniffer, 'end');

      sniffer.on('end', () => {
        sinon.assert.callCount(spy, 1);
        sinon.assert.calledWithMatch(spy, [expected]);
        done();
      });
      sniffer.find('Installation');
    });
  });

  describe('.path', () => {
    it('sets a given file', async () => {
      const searchFile = __dirname + '/fixtures/nested/d.txt';
      const matches = await FileSniffer.create()
        .path(searchFile)
        .collect(asArray())
        .find(/^p/i);

      assert.deepEqual(matches, [{
        path: getAbsolutePath('nested/d.txt'),
        match: 'passed'
      }]);
    });

    it('sets a given directory', async () => {
      const searchDirectory = __dirname + '/fixtures/nested';

      const matches = await FileSniffer.create()
        .path(searchDirectory)
        .collect(asArray())
        .find(/^p/i);

      assert.deepEqual(matches, [{
        path: getAbsolutePath('nested/d.txt'),
        match: 'passed'
      }]);
    });

    it('returns an error when a file does not exist', async () => {
      let fn = () => { };
      try {
        await FileSniffer
          .create()
          .path('does-not-exist.json')
          .find(/^academic/);
      } catch (e) {
        fn = () => { throw e; };
      } finally {
        assert.throws(fn, /does-not-exist/);
      }
    });
  });

  describe('.paths', () => {
    it('sets a given array of files', (done) => {
      const expected = fileList[0];
      const sniffer = FileSniffer.create()
        .paths([fileList[0]]);

      const spy = mockMatchEvent(sniffer, 'end');

      sniffer.on('end', () => {
        sinon.assert.calledWithMatch(spy, [expected]);
        done();
      });
      sniffer.find(/^f/);
    });

    it('sets a given array of directories', (done) => {
      const sniffer = FileSniffer.create()
        .paths([path.dirname(fileList[0]), path.dirname(nestedList[0])]);

      const spy = mockMatchEvent(sniffer, 'end');

      sniffer.on('end', () => {
        sinon.assert.calledWithMatch(spy, [fileList[1], nestedList[0]]);
        done();
      });

      sniffer.find(/^p/);
    });

    it('supports variable arguments', (done) => {
      const expected = [nestedList[1], nestedList[2]];

      const sniffer = FileSniffer.create().paths(nestedList[1], nestedList[2]);
      const spy = mockMatchEvent(sniffer);

      sniffer.on('end', () => {
        sinon.assert.callCount(spy, 2);
        sinon.assert.calledWithMatch(spy, expected[0]);
        sinon.assert.calledWithMatch(spy, expected[1]);
        done();
      });
      sniffer.find(/^f/i);
    });

    it('emits an end event when given an empty array', (done) => {
      const expected = [];

      const sniffer = FileSniffer.create().paths([]);
      const spy = mockMatchEvent(sniffer, 'end');

      sniffer.on('end', () => {
        sinon.assert.callCount(spy, 1);
        sinon.assert.calledWithMatch(spy, expected);
        done();
      });
      sniffer.find(/^whatever/i);
    });

    it('throws when an invalid argument is specified', () => {
      assert.throws(() => {
        FileSniffer.create().paths({});
      }, /paths must be an array/);
    });
  });

  describe('.depth', () => {
    it('recursion is off by default', async () => {
      const searchDirectory = __dirname + '/fixtures/nested';

      const matches = await FileSniffer.create()
        .path(searchDirectory)
        .collect(asArray())
        .find(/^p/i);

      assert.deepEqual(matches, [{
        path: getAbsolutePath('nested/d.txt'),
        match: 'passed'
      }]);
    });

    it('sets recursion depth', async () => {
      const searchDirectory = __dirname + '/fixtures/nested';

      const matches = await FileSniffer.create()
        .path(searchDirectory)
        .depth(1)
        .collect(asArray())
        .find(/^p/i);

      assert.deepEqual(matches, [{
        path: getAbsolutePath('nested/d.txt'),
        match: 'passed'
      },
      {
        path: getAbsolutePath('nested/subdir/d.txt'),
        match: 'passed'
      }]);
    });

    it('throws when depth is less than zero', () => {
      assert.throws(() => {
        FileSniffer.create().depth(-1);
      }, /Depth must be >= 0/);
    });
  });

  describe('.collect', () => {
    describe('asArray', () => {
      it('returns matches as an array of match objects', async () => {
        const matches = await FileSniffer.create()
          .paths(fileList)
          .collect(asArray())
          .find('passed');

        assert.deepEqual(matches, [{
          path: getAbsolutePath('/list/b.txt'),
          match: 'passed'
        }]);
      });

      it('returns matches as an array of match objects from multiple files', async () => {
        const matches = await FileSniffer.create()
          .paths(fileList)
          .collect(asArray())
          .find(/^f/i);

        assert.deepEqual(matches, [{
          path: getAbsolutePath('/list/a.txt'),
          match: 'failed'
        },
        {
          path: getAbsolutePath('/list/c.txt'),
          match: 'failed'
        }]);
      });

      it('returns matches as an array from the same file', async () => {
        const matches = await FileSniffer.create()
          .paths(matchingList)
          .collect(asArray())
          .find('this is line A');

        assert.deepEqual(matches, [
          { path: getAbsolutePath('/match/multiple.txt'), match: 'this is line A - 1' },
          { path: getAbsolutePath('/match/multiple.txt'), match: 'this is line A - 2' },
          { path: getAbsolutePath('/match/multiple.txt'), match: 'this is line A - 3' }
        ]);
      });
    });

    describe('asObject', () => {
      it('returns matches as an object', async () => {
        const matches = await FileSniffer.create()
          .paths(fileList)
          .collect(asObject())
          .find('passed');

        const expected = {};
        expected[getAbsolutePath('/list/b.txt')] = ['passed'];

        assert.deepEqual(matches, expected);
      });

      it('returns matches from multiple files', async () => {
        const matches = await FileSniffer.create()
          .paths(fileList)
          .collect(asObject())
          .find('failed');

        const expected = {};
        expected[getAbsolutePath('/list/a.txt')] = ['failed'];
        expected[getAbsolutePath('/list/c.txt')] = ['failed'];

        assert.deepEqual(matches, expected);
      });

      it('returns multiple matches from the same file', async () => {
        const matches = await FileSniffer.create()
          .paths(matchingList)
          .collect(asObject())
          .find('this is line A');

        const expected = {};
        expected[getAbsolutePath('/match/multiple.txt')] = [
          'this is line A - 1',
          'this is line A - 2',
          'this is line A - 3'];

        assert.deepEqual(matches, expected);
      });
    });
  });

  describe('.find', () => {
    it('returns files from a given list that contains a given string', (done) => {
      const expected = [fileList[1]];

      const sniffer = FileSniffer.create().paths(fileList);
      const spy = mockMatchEvent(sniffer);

      sniffer.on('end', () => {
        sinon.assert.callCount(spy, 1);
        sinon.assert.calledWithMatch(spy, expected[0]);
        done();
      });

      sniffer.find('passed');
    });

    it('returns files from a given list that contains a pattern', (done) => {
      const expected = [fileList[0], fileList[2]];

      const sniffer = FileSniffer.create().paths(fileList);
      const spy = mockMatchEvent(sniffer);

      sniffer.on('end', () => {
        sinon.assert.callCount(spy, 2);
        sinon.assert.calledWithMatch(spy, expected[0]);
        sinon.assert.calledWithMatch(spy, expected[1]);
        done();
      });
      sniffer.find(/^f/i);
    });

    it('emits the filename', (done) => {
      const expected = [fileList[1]];
      const sniffer = FileSniffer.create().paths(fileList);

      sniffer.on('match', (filename) => {
        assert.equal(filename, expected);
        done();
      });
      sniffer.find(/^passed/);
    });

    it('emits eof event when a file has been read', (done) => {
      const expected = fileList[0];
      const sniffer = FileSniffer.create().paths([fileList[0]]);

      sniffer.on('eof', (filename) => {
        assert.equal(filename, expected);
        done();
      });
      sniffer.find(/Nullam/);
    });

    it('emits all matching lines as match events', (done) => {
      const match1 = 'Nullam rhoncus nisl et tellus molestie tincidunt.';
      const match2 = 'In sit amet viverra leo. Donec sodales metus erat. Nullam consequat dui vel pretium auctor.';
      const match3 = 'lobortis sem. Proin bibendum ex at purus ornare faucibus. Nullam semper ligula vel quam aliquam,';

      const sniffer = FileSniffer.create().paths(matchingList);

      const spy = sinon.spy();
      sniffer.on('match', spy);

      sniffer.on('end', () => {
        sinon.assert.callCount(spy, 3);
        sinon.assert.calledWithMatch(spy, 'lorem-ipsum.txt', match1);
        sinon.assert.calledWithMatch(spy, 'lorem-ipsum.txt', match2);
        sinon.assert.calledWithMatch(spy, 'lorem-ipsum.txt', match3);
        done();
      });

      sniffer.find(/Nullam/);
    });

    it('ignores binary files by default', (done) => {
      const expected = [fileList[0], fileList[2]];

      const sniffer = FileSniffer.create().paths(expected.concat(binaryList));

      const spy = sinon.spy();
      sniffer.on('eof', spy);

      sniffer.on('end', () => {
        sinon.assert.callCount(spy, 2);
        sinon.assert.calledWithMatch(spy, 'a.txt');
        sinon.assert.calledWithMatch(spy, 'c.txt');
        done();
      });
      sniffer.find(/^f/i);
    });

    it('ignores hidden files', (done) => {
      const expected = hidden[0];
      const searchDirectory = __dirname + '/fixtures/listWithHidden';

      const sniffer = FileSniffer.create().path(searchDirectory);
      const spy = mockMatchEvent(sniffer);

      sniffer.on('end', () => {
        sinon.assert.callCount(spy, 1);
        sinon.assert.calledWithMatch(spy, expected);
        done();
      });

      sniffer.find(/^passed/);
    });

    it('finds matches in a gzipped file', (done) => {
      const match1 = 'Nullam rhoncus nisl et tellus molestie tincidunt.';
      const match2 = 'In sit amet viverra leo. Donec sodales metus erat. Nullam consequat dui vel pretium auctor.';
      const match3 = 'lobortis sem. Proin bibendum ex at purus ornare faucibus. Nullam semper ligula vel quam aliquam,';

      const sniffer = FileSniffer
        .create()
        .paths(gzipped)
        .gzip();

      const spy = sinon.spy();
      sniffer.on('match', spy);

      sniffer.on('end', () => {
        sinon.assert.callCount(spy, 3);
        sinon.assert.calledWithMatch(spy, 'lorem-ipsum.txt.gz', match1);
        sinon.assert.calledWithMatch(spy, 'lorem-ipsum.txt.gz', match2);
        sinon.assert.calledWithMatch(spy, 'lorem-ipsum.txt.gz', match3);
        done();
      });

      sniffer.find(/Nullam/);
    });

    it('returns an error when no search pattern is specified', async () => {
      let fn = () => { };
      try {
        await FileSniffer
          .create()
          .find();
      } catch (e) {
        fn = () => { throw e; };
      } finally {
        assert.throws(fn, /Search string or pattern must be specified/);
      }
    });

    it('emits an error event when a file does not exist', (done) => {
      const sniffer = FileSniffer.create().path('does-not-exist.json');

      sniffer.on('error', (err) => {
        assert.include(err.message, 'does-not-exist.json');
        done();
      });

      sniffer.find(/^academic/);
    });
  });
});
