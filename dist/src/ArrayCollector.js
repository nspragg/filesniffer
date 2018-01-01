"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ArrayCollector {
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
exports.ArrayCollector = ArrayCollector;
//# sourceMappingURL=ArrayCollector.js.map