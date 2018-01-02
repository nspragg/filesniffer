import { Collector } from './collector';

export class ArrayCollector implements Collector {
  private results;

  constructor() {
    this.results = [];
  }

  collect(line, meta) {
    this.results.push({
      path: meta.path,
      match: line
    });
  }

  matches() { return this.results; }
}

