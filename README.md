# FileSniffer

[![Build Status](https://travis-ci.org/nspragg/filesniffer.svg)](https://travis-ci.org/nspragg/filesniffer) [![Coverage Status](https://coveralls.io/repos/github/nspragg/filesniffer/badge.svg?branch=master)](https://coveralls.io/github/nspragg/filesniffer?branch=master)

> Find files and matching content

* [Installation](#installation)
* [Features](#features)
* [Usage](#usage)
* [API](#api)
* [Instance methods](#instance-methods)
* [Test](#test)
* [Contributing](#contributing)

## Installation

```
npm install --save filesniffer
```

## Features

* Built on streams to handle large files
* Integrates with [FileHound](https://github.com/nspragg/filehound)
* Uses events to emit matching data and the names of matches files

## Usage

Searches the current working directory for files containing the string `some string`:

```js
const sniffer = FileSniffer.create();

sniffer.on('match', (filename, line) => {
  console.log(`Matching line ${line} found in ${filename}`);
});

sniffer.on('end', (filenames) => {
  console.log(`All files that match: ${filenames}`);
});

sniffer.find('some string');
```

#### Search files in a specific directory

Recursively search from `/tmp` for files containing `myPattern`

```js
 const sniffer = FileSniffer.create('/tmp');

 sniffer.on('end', (filenames) => {
   console.log(filenames);
 });

 sniffer.find(/myPattern/);
```

#### Using [FileHound](https://github.com/nspragg/filehound) for flexible file filtering

Perform depth first search starting from the current working directory for all JSON files, modified
less than 10 minutes ago, containing `myPattern`:

```js
const CRITERIA = Filehound.create()
  .ext('json')
  .modified('<10m');

  const sniffer = FileSniffer.create(CRITERIA);

  sniffer.on('end', (filenames) => {
    console.log(filenames);
  });
  sniffer.find(/myPattern/);
```

#### Search a given list of files

Searches list of files for `myPattern`:

```js
const sniffer = FileSniffer.create(files);
const files = [
  '/tmp/file1.txt',
  '/tmp/file2.txt'
];

sniffer.on('end', (filenames) => {
  console.log(filenames);
});

sniffer.find(/myPattern/);
```

#### Get matching content

Listen to a match event to get all lines that match `myPattern`

```js
const sniffer = FileSniffer.create(file);
const matchingLines = [];

sniffer.on('match', (line) => {
  lines.push(line);
});

sniffer.find(/myPattern/);
```

## API

### Static methods

### `FileSniffer.create(source) -> FileSniffer`

##### Parameters
* source - _optional_ - can be one of the following:
 * directory
 * file
 * an array of files and/or directories
 * a FileHound instance

 If no source if specified, source defaults to the current working directory

##### Returns
Returns a FileSniffer instance.

## Instance methods

### `.find(/myPattern/)`

Execute search using myPattern

##### Parameters
* pattern - regular expression or literal string

##### Returns - none

## Test

```
npm test
```

To generate a test coverage report:

```
npm run coverage
```
## Contributing

* If you're unsure if a feature would make a good addition, you can always [create an issue](https://github.com/nspragg/filesniffer/issues/new) first.
* We aim for 100% test coverage. Please write tests for any new functionality or changes.
* Make sure your code meets our linting standards. Run `npm run lint` to check your code.
* Maintain the existing coding style. There are some settings in `.jsbeautifyrc` to help.
* Be mindful of others when making suggestions and/or code reviewing.
