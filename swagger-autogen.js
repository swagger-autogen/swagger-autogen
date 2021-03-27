require('./src/prototype-functions')
const fs = require('fs')
const swaggerTags = require('./src/swagger-tags')
const handleFiles = require('./src/handle-files')
const statics = require('./src/statics')

const { platform } = process
const symbols = platform === 'win32' ? { success: '', failed: '' } : { success: '✔', failed: '✖' }

module.exports = function (args) {
    let options = { language: null, disableLogs: false, disableWarnings: false }
    let recLang = null
    if (args && typeof args === 'string')   // will be deprecated in a future version
        recLang = args
    else if (args && typeof args === 'object')
        options = { ...options, ...args }

    swaggerTags.setLanguage(recLang || options.language || 'en-US')
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
                // Removing all null attributes
                for (let key in objDoc) {
                    if (objDoc[key] === null)
                        delete objDoc[key]
                }
         
                if (!objDoc.info.version)
                    objDoc.info.version = statics.TEMPLATE.info.version
                if (!objDoc.info.title)
                    objDoc.info.title = statics.TEMPLATE.info.title
                if (!objDoc.info.description)
                    objDoc.info.description = statics.TEMPLATE.info.description

                for (let file = 0; file < endpointsFiles.length; file++) {
                    const filePath = endpointsFiles[file]
                    const resp = await fs.existsSync(filePath)
                    if (!resp) {
                        console.error("\nError: Endpoint file not found => " + "'" + filePath + "'")
                        if (!options.disableLogs)
                            console.log('Swagger-autogen:', "\x1b[31m", 'Failed ' + symbols.failed, "\x1b[0m")
                        return resolve(false)
                    }

                    let relativePath = filePath.split('/')
                    if (relativePath.length > 1) {
                        relativePath.pop()
                        relativePath = relativePath.join('/')
                    } else
                        relativePath = null

                    let obj = await handleFiles.readEndpointFile(filePath, '', relativePath, [])
                    if (obj === false) {
                        if (!options.disableLogs)
                            console.log('Swagger-autogen:', "\x1b[31m", 'Failed ' + symbols.failed, "\x1b[0m")
                        return resolve(false)
                    }
                    objDoc.paths = { ...objDoc.paths, ...obj }
                }
                let constainXML = false
                if (JSON.stringify(objDoc).includes('application/xml'))     // TODO: improve this
                    constainXML = true
                swaggerTags.setDefinitions(objDoc.definitions)
                Object.keys(objDoc.definitions).forEach(definition => {
                    if (constainXML)
                        objDoc.definitions[definition] = { ...swaggerTags.formatDefinitions(objDoc.definitions[definition], {}, constainXML), xml: { name: definition } }
                    else
                        objDoc.definitions[definition] = { ...swaggerTags.formatDefinitions(objDoc.definitions[definition], {}, constainXML) }
                })
                let dataJSON = JSON.stringify(objDoc, null, 2)
                fs.writeFileSync(outputFile, dataJSON)
                if (!options.disableLogs)
                    console.log('Swagger-autogen:', "\x1b[32m", 'Success ' + symbols.success, "\x1b[0m")
                return resolve({ success: true, data: objDoc })
            } catch (err) {
                if (!options.disableLogs)
                    console.log('Swagger-autogen:', "\x1b[31m", 'Failed ' + symbols.failed, "\x1b[0m")
                return resolve({ success: false, data: null })
            }
        })
    }
}
