# FileSniffer

[![Build Status](https://travis-ci.org/nspragg/filesniffer.svg)](https://travis-ci.org/nspragg/filesniffer) [![Coverage Status](https://coveralls.io/repos/github/nspragg/filesniffer/badge.svg?branch=master)](https://coveralls.io/github/nspragg/filesniffer?branch=master)

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
// Searches for `someString` in `/tmp/test.txt`, returning all matches as an array 
const matches = await FileSniffer.create()
  .path('/tmp/test.txt')
  .depth(1)
  .collect(asArray())
  .find('someString');

  console.log(matches); // array of matching lines
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
