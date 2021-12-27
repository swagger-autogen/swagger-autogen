
const tape = require('tape')
const _test = require('tape-promise').default
const test = _test(tape)

String.prototype.replaceAll = function (search, replacement) {
  return this.split(search).join(replacement);
};

require('./unit.test.utils')
require('./unit.test.handle-data')



// TODO:
// stack0SymbolRecognizer
// stackSymbolRecognizer
// popFunction
// getSwaggerComments

