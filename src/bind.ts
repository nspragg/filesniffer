function isMethod(propertyName, value): boolean {
  return propertyName !== 'constructor' && typeof value === 'function';
}

export default function (obj): any {
  const propertyNames = Object.getOwnPropertyNames(obj.constructor.prototype);
  propertyNames.forEach((propertyName) => {
    const value = obj[propertyName];
    if (isMethod(propertyName, value)) {
      obj[propertyName] = value.bind(obj);
    }
  });
}
