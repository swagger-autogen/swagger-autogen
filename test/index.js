const fs = require('fs')
var tape = require('tape')
var _test = require('tape-promise').default
var test = _test(tape)

const swaggerAutogen = require('../swagger-autogen')()
const inst = require('./instances')

const expectedPaths = inst.expectedPaths
var expectedDoc = inst.cloneObj(inst.doc)
expectedDoc.definitions = inst.expectedDefinitions

test('endpoints/easy.js:', async (t) => {
  await swaggerAutogen('./swagger_output.json', ['./test/endpoints/easy.js'], inst.cloneObj(inst.doc)).then(() => {
    fs.readFile('./swagger_output.json', 'utf8', function (err, data) {
      let output = JSON.parse(data)

      t.deepEqual(output.info, expectedDoc.info, "doc.info: OK")
      t.assert(output.host === expectedDoc.host, "doc.host: OK")
      t.assert(output.basePath === expectedDoc.basePath, "doc.basePath: OK")
      t.deepEqual(output.schemes, expectedDoc.schemes, "doc.schemes: OK")
      t.deepEqual(output.consumes, expectedDoc.consumes, "doc.consumes: OK")
      t.deepEqual(output.produces, expectedDoc.produces, "doc.produces: OK")
      t.deepEqual(output.tags, expectedDoc.tags, "doc.tags: OK")
      t.deepEqual(output.securityDefinitions, expectedDoc.securityDefinitions, "doc.securityDefinitions: OK")

      // t.deepEqual(output.definitions, expectedDoc.definitions, "doc.definitions: OK")
      t.deepEqual(output.definitions.AddUser, expectedDoc.definitions.AddUser, "doc.definitions.AddUser: OK")
      t.deepEqual(output.definitions.Parents, expectedDoc.definitions.Parents, "doc.definitions.Parents: OK")
      t.deepEqual(output.definitions.User, expectedDoc.definitions.User, "doc.definitions.User: OK")
      t.deepEqual(output.definitions.Definit_00, expectedDoc.definitions.Definit_00, "doc.definitions.Definit_00: OK")
      t.deepEqual(output.definitions.Definit_01, expectedDoc.definitions.Definit_01, "doc.definitions.Definit_01: OK")
      t.deepEqual(output.definitions.Definit_02, expectedDoc.definitions.Definit_02, "doc.definitions.Definit_02: OK")
      t.deepEqual(output.definitions.Definit_03, expectedDoc.definitions.Definit_03, "doc.definitions.Definit_03: OK")
      t.deepEqual(output.definitions.Definit_04, expectedDoc.definitions.Definit_04, "doc.definitions.Definit_04: OK")
      t.deepEqual(output.definitions.Definit_05, expectedDoc.definitions.Definit_05, "doc.definitions.Definit_05: OK")
      t.deepEqual(output.definitions.Definit_06, expectedDoc.definitions.Definit_06, "doc.definitions.Definit_06: OK")
      t.deepEqual(output.definitions.Definit_07, expectedDoc.definitions.Definit_07, "doc.definitions.Definit_07: OK")
      t.deepEqual(output.definitions.Definit_08, expectedDoc.definitions.Definit_08, "doc.definitions.Definit_08: OK")
      t.deepEqual(output.definitions.Definit_09, expectedDoc.definitions.Definit_09, "doc.definitions.Definit_09: OK")
      t.deepEqual(output.definitions.Definit_10, expectedDoc.definitions.Definit_10, "doc.definitions.Definit_10: OK")
      t.deepEqual(output.definitions.Definit_11, expectedDoc.definitions.Definit_11, "doc.definitions.Definit_11: OK")
      t.deepEqual(output.definitions.Definit_12, expectedDoc.definitions.Definit_12, "doc.definitions.Definit_12: OK")
      t.deepEqual(output.definitions.Definit_13, expectedDoc.definitions.Definit_13, "doc.definitions.Definit_13: OK")
      t.deepEqual(output.definitions.Definit_14, expectedDoc.definitions.Definit_14, "doc.definitions.Definit_14: OK")
      t.deepEqual(output.definitions.Definit_15, expectedDoc.definitions.Definit_15, "doc.definitions.Definit_15: OK")
      t.deepEqual(output.definitions.Definit_16, expectedDoc.definitions.Definit_16, "doc.definitions.Definit_16: OK")
      
      /* PATHS */
      t.true(true, " "); t.true(true, "\nPaths (endpoints/easy.js):")
      t.deepEqual(output.paths["/automatic/user/{id}"], expectedPaths["/automatic/user/{id}"], '["/automatic/user/{id}"]: OK')
      t.deepEqual(output.paths["/automatic/user"], expectedPaths["/automatic/user"], '["/automatic/user"]: OK')
      t.deepEqual(output.paths["/automatic_and_incremented/user/{id}"], expectedPaths["/automatic_and_incremented/user/{id}"], '["/automatic_and_incremented/user/{id}"]: OK')
      t.deepEqual(output.paths["/automatic_and_incremented/user"], expectedPaths["/automatic_and_incremented/user"], '["/automatic_and_incremented/user"]: OK')
      t.deepEqual(output.paths["/manual/user/{id}"], expectedPaths["/manual/user/{id}"], '["/manual/user/{id}"]: OK')
      t.deepEqual(output.paths["/security"], expectedPaths["/security"], '["/security"]: OK')
      t.deepEqual(output.paths["/forcedEndpoint/{id}"], expectedPaths["/forcedEndpoint/{id}"], '["/forcedEndpoint/{id}"]: OK')

      t.end()
    })
  })
})

/* Teste de quebra de linha, espaços a mais e uso de ';' */
test('endpoints/_01.js:', async (t) => {
  await swaggerAutogen('./test/swagger_output_01.json', ['./test/endpoints/_01.js'], inst.cloneObj(inst.doc)).then(() => {
    fs.readFile('./test/swagger_output_01.json', 'utf8', function (err, data) {
      let output = JSON.parse(data)

      /* PATHS */
      t.true(true, " "); t.true(true, "\nPaths (endpoints/_01.js):")
      t.deepEqual(output.paths["/automatic/user/{id}"], expectedPaths["/automatic/user/{id}"], '["/automatic/user/{id}"]: OK')
      t.deepEqual(output.paths["/automatic/user"], expectedPaths["/automatic/user"], '["/automatic/user"]: OK')
      t.deepEqual(output.paths["/automatic_and_incremented/user/{id}"], expectedPaths["/automatic_and_incremented/user/{id}"], '["/automatic_and_incremented/user/{id}"]: OK')
      t.deepEqual(output.paths["/automatic_and_incremented/user"], expectedPaths["/automatic_and_incremented/user"], '["/automatic_and_incremented/user"]: OK')
      t.deepEqual(output.paths["/manual/user/{id}"], expectedPaths["/manual/user/{id}"], '["/manual/user/{id}"]: OK')
      t.deepEqual(output.paths["/security"], expectedPaths["/security"], '["/security"]: OK')
      t.deepEqual(output.paths["/forcedEndpoint/{id}"], expectedPaths["/forcedEndpoint/{id}"], '["/forcedEndpoint/{id}"]: OK')


      t.end()
    })
  })
})

/* Teste invertendo declaração dos parâmetros */
test('endpoints/_02.js:', async (t) => {
  await swaggerAutogen('./test/swagger_output_02.json', ['./test/endpoints/_02.js'], inst.cloneObj(inst.doc)).then(() => {
    fs.readFile('./test/swagger_output_02.json', 'utf8', function (err, data) {
      let output = JSON.parse(data)

      /* PATHS */
      t.true(true, " "); t.true(true, "\nPaths (endpoints/_02.js):")
      t.deepEqual(output.paths["/automatic/user/{id}"], expectedPaths["/automatic/user/{id}"], '["/automatic/user/{id}"]: OK')
      t.deepEqual(output.paths["/automatic/user"], expectedPaths["/automatic/user"], '["/automatic/user"]: OK')
      t.deepEqual(output.paths["/automatic_and_incremented/user/{id}"], expectedPaths["/automatic_and_incremented/user/{id}"], '["/automatic_and_incremented/user/{id}"]: OK')
      t.deepEqual(output.paths["/automatic_and_incremented/user"], expectedPaths["/automatic_and_incremented/user"], '["/automatic_and_incremented/user"]: OK')
      t.deepEqual(output.paths["/manual/user/{id}"], expectedPaths["/manual/user/{id}"], '["/manual/user/{id}"]: OK')
      t.deepEqual(output.paths["/security"], expectedPaths["/security"], '["/security"]: OK')
      t.deepEqual(output.paths["/forcedEndpoint/{id}"], expectedPaths["/forcedEndpoint/{id}"], '["/forcedEndpoint/{id}"]: OK')

      t.end()
    })
  })
})

