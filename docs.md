# FileSniffer

[![Build Status](https://travis-ci.org/nspragg/filesniffer.svg)](https://travis-ci.org/nspragg/filesniffer) [![Coverage Status](https://coveralls.io/repos/github/nspragg/filesniffer/badge.svg?branch=master)](https://coveralls.io/github/nspragg/filesniffer?branch=master)

> Flexible and fluent interface for searching files or search for files by content

## Common examples

### Collector functions

#### Search a specific file 

Searches for `str` in `someFile` and return matches as an array 

```js
const {FileSniffer, asArray} = require('filesniffer');

const someFile = ...
const matches = FileSniffer
  .create()
  .path(someFile)
  .collect(asArray())
  .find();

console.log(matches);
```

#### Search a list of files

Searches for `str` in `arrayOfFiles` and return matches as an array 

```js
const {FileSniffer, asArray} = require('filesniffer');

const arrayOfFiles = [...];
const matches = FileSniffer
  .create()
  .paths(arrayOfFiles)
  .collect(asArray())
  .find();

console.log(matches);
```

#### Search a directory

Searches for `str` in `someDirectory` and return matches as an array 

```js
const {FileSniffer, asArray} = require('filesniffer');

const someDirectory = ...
const matches = FileSniffer
  .create()
  .path(someDirectory)
  .collect(asArray())
  .find();

console.log(matches);
```

#### Search a directory recursively

Recursively searches for `str` in `someDirectory` and return matches as an array 

```js
const {FileSniffer, asArray} = require('filesniffer');

const someDirectory = ...
const matches = FileSniffer
  .create()
  .path(someDirectory)
  .depth(10) // 10 levels 
  .collect(asArray())
  .find();

console.log(matches);
```

#### Return matches as an object

Searches for `str` in `someFile` and return matches as an object 

```js
const {FileSniffer, asObject} = require('filesniffer');

const someFile = ...
const matches = FileSniffer
  .create()
  .path(someFile)
  .collect(asObject())
  .find();

console.log(matches); // pathname -> array of matches
```

#### Write a custom collector

Searches for `str` in `someFile` and writes matches to another file

```ts
const {FileSniffer, asObject, Collector} = require('filesniffer');

// Custom collector written in Typescript
class ToFile implements Collector {
  private file;

  constructor(file) {
    this.file = fs.createWriteStream(file);
  }

  collect(line, meta) {
    this.file.write(line);
  }

  matches() { 
    this.file.end();
    return this.results; 
  }
}

const someFile = ...
const targetFile = ...
const matches = FileSniffer
  .create()
  .collect(new ToFile(targetFile))
  .find('str');

console.log(matches); // pathname -> array of matches
```

### Event based searches

#### Search files (recursion off) in the current working directory

Searches the current working directory for files containing the string `some string`:

```js
const sniffer = FileSniffer.create();

// register event handlers
sniffer.on('match', (filename, line) => {
  console.log(`Matching line ${line} found in ${filename}`);
});

sniffer.on('end', (filenames) => {
  console.log(`All files that match: ${filenames}`);
});

// start search
sniffer.find('some string');
```

#### Search files in a specific directory

Recursively search from `/tmp` for files containing `myPattern`

```js
 const sniffer = FileSniffer
  .create()
  .path('/tmp');

 sniffer.on('end', (filenames) => {
   console.log(filenames);
 });

 sniffer.find(/myPattern/);
```

#### Search a given list of files

Searches list of files for `myPattern`:

```js
const files = [
  '/tmp/file1.txt',
  '/tmp/file2.txt'
];
const sniffer = FileSniffer
  .create()
  .paths(files);

sniffer.on('end', (filenames) => {
  console.log(filenames);
});

sniffer.find(/myPattern/);
```

#### Get matching content

Listen to a match event to get all lines that match `myPattern`

```js
const sniffer = FileSniffer
  .create()
  .path(file);

const matchingLines = [];

sniffer.on('match', (filename, line) => {
  lines.push(line);
});

sniffer.find(/myPattern/);
```

#### Search gzip files

Search files, including gzip files, in `dir`, containing `myPattern`

```js
const path = require('path');

const sniffer = FileSniffer
  .create(dir)
  .gzip();

sniffer.on('match', (filename, line) => {
  if (path.extname(filename) === '.gz') {
    console.log(`Found ${line} in gzip file`)
  }
});

sniffer.find(/myPattern/);
```