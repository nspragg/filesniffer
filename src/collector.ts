export interface Collector {
  collect(line, object?);
  matches();
}
