
const tape = require('tape')
const _test = require('tape-promise').default
const test = _test(tape)
const utils = require('../src/utils')


/**
 * Unitary tests
 */

test('Unitary tests [popString(...)]:', async (t) => {

  let resp = utils.popString(`
    easy easy "Some text..." easy easy
  `)  
  t.deepEqual(resp, "Some text...", '[popString(...)] 001')

  resp = utils.popString(`
    easy easy "Some text..." easy easy
  `, true)  
  t.deepEqual(resp, '"Some text..."', '[popString(...)] 002')

  resp = utils.popString(`
    easy easy "Some 'text..." easy easy
  `)  
  t.deepEqual(resp, "Some 'text...", '[popString(...)] 003')

  resp = utils.popString(`
    easy easy "Some 'text..." easy easy
  `, true)  
  t.deepEqual(resp, '"Some \'text..."', '[popString(...)] 004')

  resp = utils.popString(`
    easy easy 'Some "text...' easy easy
  `)  
  t.deepEqual(resp, 'Some "text...', '[popString(...)] 005')

  resp = utils.popString(`
    easy easy 'Some "text...' easy easy
  `, true)  
  t.deepEqual(resp, "'Some \"text...'", '[popString(...)] 006')

  resp = utils.popString(`"Some text..."`)  
  t.deepEqual(resp, "Some text...", '[popString(...)] 007')

  resp = utils.popString(`"Some text..."`, true)  
  t.deepEqual(resp, '"Some text..."', '[popString(...)] 008')

  resp = utils.popString(`"Some 'text..."`)  
  t.deepEqual(resp, "Some 'text...", '[popString(...)] 009')

  resp = utils.popString(`"Some 'text..."`, true)  
  t.deepEqual(resp, '"Some \'text..."', '[popString(...)] 010')

  resp = utils.popString(`'Some "text...'`)  
  t.deepEqual(resp, 'Some "text...', '[popString(...)] 011')

  resp = utils.popString(`'Some "text...'`, true)  
  t.deepEqual(resp, "'Some \"text...'", '[popString(...)] 012')

  resp = utils.popString(`'Some \\"text...'`, true)  
  t.deepEqual(resp, "'Some \\\"text...'", '[popString(...)] 013')

  resp = utils.popString(`
    easy easy 'Some "\\'"text...' easy easy
    easy easy 'Some "text failed...' easy easy
  `)  
  t.deepEqual(resp, 'Some "\\\'"text...', '[popString(...)] 014')

  resp = utils.popString(`text .split(/(.*)|"|[\\s\\"]*/) text "to get"`, true)  
  t.deepEqual(resp, `"to get"`, '[popString(...)] 014')

  t.end()
  
})
