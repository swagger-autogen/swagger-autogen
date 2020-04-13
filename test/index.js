const fs = require('fs')
var tape = require('tape')
var _test = require('tape-promise').default
var test = _test(tape)

const swaggerAutogen = require('../swagger-autogen')()
const inst = require('./instances')

const expectedPaths = inst.expectedPaths
var expectedDoc = inst.cloneObj(inst.doc)
expectedDoc.definitions = {
  User: {
    type: "object",
    properties: {
      name: {
        type: "string",
        example: "Jhon Doe"
      },
      age: {
        type: "number",
        example: 29
      },
      parents: {
        type: "object",
        properties: {
          father: {
            type: "string",
            example: "Simon Doe"
          },
          mother: {
            type: "string",
            example: "Marie Doe"
          }
        }
      },
      diplomas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            school: {
              type: "string",
              example: "XYZ University"
            },
            year: {
              type: "number",
              example: 2020
            },
            completed: {
              type: "boolean",
              example: true
            },
            internship: {
              type: "object",
              properties: {
                hours: {
                  type: "number",
                  example: 290
                },
                location: {
                  type: "string",
                  example: "XYZ Company"
                }
              }
            }
          }
        }
      }
    },
    xml: {
      name: "User"
    }
  },
  AddUser: {
    type: "object",
    properties: {
      name: {
        type: "string",
        example: "Jhon Doe"
      },
      age: {
        type: "number",
        example: 29
      },
      about: {
        type: "string",
        example: ""
      }
    },
    required: [
      "name",
      "age"
    ],
    xml: {
      name: "AddUser"
    }
  }
}

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
      t.deepEqual(output.definitions, expectedDoc.definitions, "doc.definitions: OK")

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

