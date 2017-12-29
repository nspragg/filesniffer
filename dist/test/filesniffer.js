"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon = require("sinon");
const path = require("path");
const FileHound = require("filehound");
const filesniffer_1 = require("../dist/src/filesniffer");
const fileList = qualifyNames(['list/a.txt', 'list/b.txt', 'list/c.txt']);
const gzipped = qualifyNames(['gzipped']);
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
function mockMatchEvent(sniffer) {
    const spy = sinon.spy();
    sniffer.on('match', spy);
    return spy;
}
// TODO: missing test case - no matches found? no events emitted..
describe('FileSniffer', () => {
    describe('.create', () => {
        it('searches a given directory', (done) => {
            const expected = nestedList[0];
            const searchDirectory = __dirname + '/fixtures/nested';
            const sniffer = filesniffer_1.FileSniffer.create(searchDirectory);
            const spy = mockMatchEvent(sniffer);
            sniffer.on('end', () => {
                sinon.assert.callCount(spy, 1);
                sinon.assert.calledWithMatch(spy, expected);
                done();
            });
            sniffer.find(/^p/i);
        });
        it('searches a given file', (done) => {
            const expected = nestedList[0];
            const sniffer = filesniffer_1.FileSniffer.create(expected);
            const spy = mockMatchEvent(sniffer);
            sniffer.on('end', () => {
                sinon.assert.callCount(spy, 1);
                sinon.assert.calledWithMatch(spy, expected);
                done();
            });
            sniffer.find(/^p/i);
        });
        it('uses the current working directory as the default search path', (done) => {
            const expected = process.cwd() + '/' + 'README.md';
            const sniffer = filesniffer_1.FileSniffer.create();
            const spy = mockMatchEvent(sniffer);
            sniffer.on('end', () => {
                sinon.assert.callCount(spy, 1);
                sinon.assert.calledWithMatch(spy, expected);
                done();
            });
            sniffer.find(/^p/i);
        });
        it('supports variable arguments', (done) => {
            const expected = [nestedList[1], nestedList[2]];
            const sniffer = filesniffer_1.FileSniffer.create(nestedList[1], nestedList[2]);
            const spy = mockMatchEvent(sniffer);
            sniffer.on('end', () => {
                sinon.assert.callCount(spy, 2);
                sinon.assert.calledWithMatch(spy, expected[0]);
                sinon.assert.calledWithMatch(spy, expected[1]);
                done();
            });
            sniffer.find(/^f/i);
        });
        it('throws an error when given an invalid input source', () => {
            chai_1.assert.throws(() => {
                filesniffer_1.FileSniffer.create({});
            }, /Invalid input source/);
        });
        it('returns files from a given FileHound instance that contains a matching patten', (done) => {
            const expected = [fileList[0], fileList[2]];
            const criteria = FileHound
                .create()
                .paths(__dirname + '/fixtures/list')
                .ext('txt');
            const sniffer = filesniffer_1.FileSniffer.create(criteria);
            const spy = mockMatchEvent(sniffer);
            sniffer.on('end', () => {
                sinon.assert.callCount(spy, 2);
                sinon.assert.calledWithMatch(spy, expected[0]);
                sinon.assert.calledWithMatch(spy, expected[1]);
                done();
            });
            sniffer.find(/^f/i);
        });
    });
    describe('.find', () => {
        it('returns files from a given list that contains a given string', (done) => {
            const expected = [fileList[1]];
            const sniffer = filesniffer_1.FileSniffer.create(fileList);
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
            const sniffer = filesniffer_1.FileSniffer.create(fileList);
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
            const sniffer = filesniffer_1.FileSniffer.create(fileList);
            sniffer.on('match', (filename) => {
                chai_1.assert.equal(filename, expected);
                done();
            });
            sniffer.find(/^passed/);
        });
        it('emits eof event when a file has been read', (done) => {
            const expected = fileList[0];
            const sniffer = filesniffer_1.FileSniffer.create([fileList[0]]);
            sniffer.on('eof', (filename) => {
                chai_1.assert.equal(filename, expected);
                done();
            });
            sniffer.find(/Nullam/);
        });
        it('emits all matching lines as match events', (done) => {
            const match1 = 'Nullam rhoncus nisl et tellus molestie tincidunt.';
            const match2 = 'In sit amet viverra leo. Donec sodales metus erat. Nullam consequat dui vel pretium auctor.';
            const match3 = 'lobortis sem. Proin bibendum ex at purus ornare faucibus. Nullam semper ligula vel quam aliquam,';
            const sniffer = filesniffer_1.FileSniffer.create(matchingList);
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
            const sniffer = filesniffer_1.FileSniffer.create(expected.concat(binaryList));
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
            const sniffer = filesniffer_1.FileSniffer.create(searchDirectory);
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
            const sniffer = filesniffer_1.FileSniffer
                .create(gzipped)
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
        it('emits an error event when a file does not exist', (done) => {
            const sniffer = filesniffer_1.FileSniffer.create('does-not-exist.json');
            sniffer.on('error', (err) => {
                chai_1.assert.include(err.message, 'does-not-exist.json');
                done();
            });
            sniffer.find(/^academic/);
        });
    });
});
//# sourceMappingURL=filesniffer.js.map