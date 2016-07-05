const Transform = require('stream').Transform;
import binary from './binary';

class StringStream extends Transform {
  constructor() {
    super();
  }

  _transform(data, encoding, cb) {
    const text = binary.strings(data);
    text.forEach((ascii) => {
      this.push(ascii);
    });

    cb();
  }
}

module.exports = StringStream;
