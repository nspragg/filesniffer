import { Collector } from './collector';

export class NoopCollector implements Collector {
  collect() { }
  matches() { return []; }
}

