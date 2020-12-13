require('./src/prototype-functions')
const fs = require('fs')
const symbols = require('figures')
const swaggerTags = require('./src/swagger-tags')
const handleFiles = require('./src/handle-files')
const statics = require('./src/statics')

module.exports = function (recLang = null) {
    swaggerTags.setLanguage(recLang || 'en')
    return async (outputFile, endpointsFiles, data) => {
        return new Promise(async (resolve) => {
            try {
                if (!outputFile)
                    throw console.error("\nError: 'outputFile' was not specified.")
                if (!endpointsFiles)
                    throw console.error("\nError: 'endpointsFiles' was not specified.")

                // Checking if endpoint files exist
                for (var idx = 0; idx < endpointsFiles.length; ++idx) {
                    var file = endpointsFiles[idx]
                    var extension = await handleFiles.getExtension(file)
                    endpointsFiles[idx] = file + extension
                    if (!fs.existsSync(file + extension)) {
                        throw console.error("\nError: File not found: '" + file + "'")
                    }
                }

                const objDoc = { ...statics.TEMPLATE, ...data, paths: {} }
                for (let file = 0; file < endpointsFiles.length; file++) {
                    const filePath = endpointsFiles[file]
                    const resp = await fs.existsSync(filePath)
                    if (!resp) {
                        console.error("\nError: Endpoint file not found => " + "'" + filePath + "'")
                        console.log('Swagger-autogen:', "\x1b[31m", 'Failed ' + symbols.cross, "\033[0m")
                        return resolve(false)
                    }

                    let relativePath = filePath.split('/')
                    if (relativePath.length > 1) {
                        relativePath.pop()
                        relativePath = relativePath.join('/')
                    } else
                        relativePath = null

                    let obj = await handleFiles.readEndpointFile(filePath, '', relativePath)
                    if (obj === false) {
                        console.log('Swagger-autogen:', "\x1b[31m", 'Failed ' + symbols.cross, "\033[0m")
                        return resolve(false)
                    }
                    objDoc.paths = { ...objDoc.paths, ...obj }
                }
                swaggerTags.setDefinitions(objDoc.definitions)
                Object.keys(objDoc.definitions).forEach(definition => {
                    objDoc.definitions[definition] = { ...swaggerTags.formatDefinitions(objDoc.definitions[definition]), xml: { name: definition } }
                })
                let dataJSON = JSON.stringify(objDoc, null, 2)
                fs.writeFileSync(outputFile, dataJSON)

                console.log('Swagger-autogen:', "\x1b[32m", 'Success ' + symbols.tick, "\033[0m")
                return resolve({ success: true, data: objDoc })
            } catch (err) {
                console.log('Swagger-autogen:', "\x1b[31m", 'Failed ' + symbols.cross, "\033[0m")
                return resolve({ success: false, data: null })
            }
        })
    }
}
