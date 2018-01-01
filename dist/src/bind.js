"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isMethod(propertyName, value) {
    return propertyName !== 'constructor' && typeof value === 'function';
}
function default_1(obj) {
    const propertyNames = Object.getOwnPropertyNames(obj.constructor.prototype);
    propertyNames.forEach((propertyName) => {
        const value = obj[propertyName];
        if (isMethod(propertyName, value)) {
            obj[propertyName] = value.bind(obj);
        }
    });
}
exports.default = default_1;
//# sourceMappingURL=bind.js.map