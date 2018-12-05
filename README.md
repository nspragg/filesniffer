# FileSniffer

[![NPM downloads](https://img.shields.io/npm/dm/filesniffer.svg?style=flat)](https://npmjs.org/package/filesniffer)
[![Build Status](https://travis-ci.org/nspragg/filesniffer.svg)](https://travis-ci.org/nspragg/filesniffer) [![Coverage Status](https://coveralls.io/repos/github/nspragg/filesniffer/badge.svg?branch=master)](https://coveralls.io/github/nspragg/filesniffer?branch=master)
![github-issues](https://img.shields.io/github/issues/nspragg/filesniffer.svg)

> Find files by matching contents

* [Installation](#installation)
* [Usage](#usage)
* [Documentation](#documentation)
* [Test](#test)
* [Contributing](#contributing)

## Installation

```
npm install --save filesniffer
```

## Usage

```js
// Searches for `someString` in `/tmp/test.txt`, returning all matches as an array:
const matches = await FileSniffer.create()
  .path('/tmp/test.txt')
  .collect(asArray())
  .find('someString');

  console.log(matches); // array of matching lines
```

```js
// Use events for searching large files: 
const sniffer = await FileSniffer.create();

// register event handlers
sniffer.on('match', (filename, line) => {
  console.log(`Matching line ${line} found in ${filename}`);
});

sniffer.on('end', (filenames) => {
  console.log(`All files that match: ${filenames}`);
});

// start search
sniffer
  .path('/tmp')
  .find('some string');
```
## Documentation
For more examples and API details, see [API documentation](https://nspragg.github.io/filesniffer/)

## Test

```
npm test
```

## Test Coverage 

To generate a test coverage report:

```
npm run coverage
```

## Contributing 

See [contributing guidelines](./CONTRIBUTING.md)
