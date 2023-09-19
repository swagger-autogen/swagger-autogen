
String.prototype.replaceAll = function (search, replacement) {
  return this.split(search).join(replacement);
};

require('./unit.test.utils')
require('./unit.test.handle-data')
