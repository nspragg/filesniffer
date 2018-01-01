"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ObjectCollector {
    constructor() {
        this.results = {};
    }
    collect(line, meta) {
        const n = this.results[meta.path];
        if (n) {
            this.results[meta.path].push(line);
        }
        else {
            this.results[meta.path] = [line];
        }
    }
    matches() { return this.results; }
}
exports.ObjectCollector = ObjectCollector;
//# sourceMappingURL=ObjectCollector.js.map