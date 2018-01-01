"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const isbinary_1 = require("../dist/src/isbinary");
const path = require("path");
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
function getAbsolutePath(file) {
    return path.join(__dirname + '/fixtures/', file);
}
function qualifyNames(names) {
    return names.map(getAbsolutePath);
}
describe('files', () => {
    it('identifies binary files by file extention', () => {
        BINARY_FILES.forEach((file) => {
            chai_1.assert.ok(isbinary_1.isbinary(file), `file extension ${path.extname(file)} not matched`);
        });
    });
    it('returns false for non-binary file extensions', () => {
        NON_BINARY_FILES.forEach((file) => {
            chai_1.assert.isNotOk(isbinary_1.isbinary(file));
        });
    });
    it('returns true for binary file content', () => {
        const f = getAbsolutePath('binary/binaryFile');
        chai_1.assert.ok(isbinary_1.isbinary(f));
    });
});
//# sourceMappingURL=isbinary.js.map