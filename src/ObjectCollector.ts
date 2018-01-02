import { Collector } from './collector';

export class ObjectCollector implements Collector {
  private results;

  constructor() {
    this.results = {};
  }

  collect(line, meta) {
    const n = this.results[meta.path];
    if (n) {
      this.results[meta.path].push(line);
    } else {
      this.results[meta.path] = [line];
    }
  }

  matches() { return this.results; }
}

