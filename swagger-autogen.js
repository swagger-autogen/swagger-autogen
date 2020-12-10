
const fs = require('fs')
require('./src/prototype-functions')
const tables = require('./src/tables')
const swaggerTags = require('./src/swaggerTags')

var symbols = require('figures')

const METHODS = ['get', 'head', 'post', 'put', 'delete', 'patch', 'options']

const template = {
    swagger: "2.0",
    info: {
        version: "1.0.0",
        title: "REST API",
        description: ""
    },
    host: "localhost:3000",
    basePath: "/",
    tags: [],
    schemes: ['http'],
    securityDefinitions: {},
    consumes: [],
    produces: [],
    paths: {},
    definitions: {}
}

const swaggerObj = swaggerTags.getSwaggerObj()
const unusualString = '__¬!@#$¬__' // for line break and return without text changes

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n)
}

module.exports = function (recLang = null) {
    swaggerTags.setLanguage(recLang || 'en')

    return async (outputFile, endpointsFiles, data) => {
        return new Promise(async (resolve, reject) => {
            try {
                if (!outputFile)
                    throw console.error("\nError: 'outputFile' was not specified.")
                if (!endpointsFiles)
                    throw console.error("\nError: 'endpointsFiles' was not specified.")

                // Checking if endpoint files exist
                endpointsFiles.forEach(file => {
                    if (!fs.existsSync(file)) {
                        throw console.error("\nError: File not found: '" + file + "'")
                    }
                })

                const objDoc = { ...template, ...data, paths: {} }
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
                    let obj = await readEndpointFile(filePath, '', relativePath)
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

function clearData(data) {
    // Chage "// ..." comment to "/* ... */"  |  Allow one line comment to this module
    data = data.replaceAll('*//*', '*/\n/*')
    data = data.replaceAll('*///', '*/\n//')
    data = data.replaceAll('///', '//')
    data = data.split('//').map((e, idx) => {
        if (idx != 0)
            return e.replace('\n', ' */ \n')
        return e
    })
    data = data.join('//').replaceAll('//', '/*')

    let aData = data.replaceAll('\n', unusualString)
    aData = aData.replaceAll('\t', ' ')
    aData = aData.replaceAll("Content-Type", "content-type")
    aData = aData.replaceAll("CONTENT-TYPE", "content-type")
    aData = aData.replaceAll("\"content-type\"", "__¬¬¬__content-type__¬¬¬__").replaceAll("\"application/json\"", "__¬¬¬__application/json__¬¬¬__").replaceAll("\"application/xml\"", "__¬¬¬__application/xml__¬¬¬__")
    aData = aData.replaceAll("\'content-type\'", "__¬¬¬__content-type__¬¬¬__").replaceAll("\'application/json\'", "__¬¬¬__application/json__¬¬¬__").replaceAll("\'application/xml\'", "__¬¬¬__application/xml__¬¬¬__")
    aData = aData.replaceAll("\`content-type\`", "__¬¬¬__content-type__¬¬¬__").replaceAll("\`application/json\`", "__¬¬¬__application/json__¬¬¬__").replaceAll("\`application/xml\`", "__¬¬¬__application/xml__¬¬¬__")
    aData = aData.replaceAll(unusualString, '\n')
    aData = aData.replaceAll(" async ", '')
    return aData
}

function getFunction(elem) {
    var stack = 1   // stack of '(' to get just function
    elem = elem.split('').filter(e => {
        if (stack <= 0) return false
        if (e == '(') stack += 1
        if (e == ')') stack -= 1
        return true
    }).join('')
    return elem
}

function getQueryIndirecty(elem, req, objParameters) {
    if (req && req.split(new RegExp("\\;|\\{|\\(|\\[|\\\"|\\\'|\\\`|\\}|\\)|\\]|\\:|\\,")).length == 1 && elem.split(new RegExp(" .*?\\s*=\\s*" + req + "\\.query(\\s|\\n|;)", "gmi").length > 1)) {
        let queryVars = []
        var aQuerys = elem.split(new RegExp("\\s*=\\s*" + req + "\\.query(\\s|\\n|;)", "i"))
        aQuerys = aQuerys.slice(0, -1)

        if (aQuerys.length > 0) {
            // get variables name
            for (let idx = 0; idx < aQuerys.length; idx++) {  // aQuerys.length -1
                if (aQuerys[idx].replaceAll(' ', '') != '')
                    queryVars.push(aQuerys[idx].split(new RegExp("\s+| ")).slice(-1)[0])
            }
            if (queryVars.length > 0) {
                queryVars.forEach(query => {
                    let varNames = elem.split(new RegExp(" " + query + "\\.")).splice(1)
                    varNames = varNames.map(v => v = v.split(new RegExp(" |;|\n"))[0])
                    varNames.forEach(name => {
                        objParameters[name] = { name, in: 'query' }
                    })
                })
            }
        }
    }
    return objParameters
}

function getStatus(elem, res, objResponses) {
    if (res && (elem.replaceAll(' ', '').includes(res + '.status('))) {
        elem.replaceAll(' ', '').split(res + '.status(').splice(1).forEach(s => {
            let status = s.split(')')[0]
            if (isNumeric(status) && !!objResponses[status] === false) {
                objResponses[status] = { description: tables.getHttpStatusDescription(status, swaggerTags.getLanguage()) }
            } else if (isNumeric(status) && !!objResponses[status] === true) {  // concatenated with existing information
                objResponses[status] = { description: tables.getHttpStatusDescription(status, swaggerTags.getLanguage()), ...objResponses[status] }
            }
        })
    }
    return objResponses
}

function getHeader(elem, path, method, res, objEndpoint) {
    if (res && (elem.replaceAll(' ', '').includes(res + '.setHeader('))) {
        elem = elem.replaceAll(' ', '')
        let aContentType = []
        elem.split(res + '.setHeader(').splice(1).forEach(s => {
            if (s.includes(',') && s.split(',')[0].includes('content-type'))
                aContentType.push(s.split(',\"')[1].split('\")')[0])
        })
        objEndpoint[path][method].produces = aContentType
    }
    return objEndpoint
}

function getQuery(elem, req, objParameters) {
    if (req && (elem.split(req + '.query.').length > 1)) {
        elem.split(req + '.query.').splice(1).forEach(p => {
            let name = p.split(/\(|\)|\{|\}|\[|\]|\/|\\|\;|\:|\?|\+|,|\||\&|\t|\n| /)[0].replaceAll(' ', '')
            if (name.includes('.'))
                name = name.split('.')[0]
            if (!!objParameters[name] === false)    // Checks if the parameter name already exists
                objParameters[name] = { name, in: 'query' }
            if (!objParameters[name].in)
                objParameters[name].in = 'query'
        })
    }
    return objParameters
}

function getCallbackParameters(line) {
    let paramCallback = ''
    let req = null
    let res = null
    let next = null

    if (line.includes(','))
        paramCallback = line.replace(',', unusualString).split(unusualString)[1].replaceAll(' ', '').split(')')[0].split('=>')[0].split('{')[0]
    if (paramCallback.includes('('))
        paramCallback = paramCallback.split('(')[1]
    if (paramCallback != '') {
        if (!paramCallback.includes(','))
            req = paramCallback.replaceAll('(', '').replaceAll(')', '')
        else {
            paramCallback = paramCallback.split(',')
            if (paramCallback.length == 1) {
                req = paramCallback[0].replaceAll('(', '').replaceAll(')', '')
            } else {
                req = paramCallback[0].replaceAll('(', '').replaceAll(')', '')
                res = paramCallback[1].replaceAll('(', '').replaceAll(')', '')
                if (paramCallback[2])   // NOTE: For future use
                    next = paramCallback[2].replaceAll('(', '').replaceAll(')', '')
            }
        }
    }
    return { req, res, next }
}

function getPathParameters(path, objParameters) {
    if (path.split('{').length > 1) {
        path.split('{').slice(1).forEach(p => {
            let name = p.split('}')[0]
            if (!!objParameters[name] === false)    // Checks if the parameter name already exists
                objParameters[name] = { name, in: 'path', required: true }
        })
    }
    return objParameters
}

function readEndpointFile(filePath, pathRoute = '', relativePath) {
    return new Promise((resolve, reject) => {
        let paths = {}
        fs.readFile(filePath, 'utf8', async function (err, data) {
            if (err) throw console.error(err)
            let regex = "\\.use\\s*\\(|\\.get\\s*\\(|\\.head\\s*\\(|\\.post\\s*\\(|\\.put\\s*\\(|\\.delete\\s*\\(|\\.patch\\s*\\(|\\.options\\s*\\("
            let aData = await removeComments(data, true)
            aData = clearData(aData)
            let firstPattern = null
            if (aData.includes(swaggerObj + '.patterns')) { // Manual pattern recognition
                let patterns = null
                try {  // Handling syntax error
                    patterns = eval(aData.replaceAll(' ', '').split(swaggerObj + '.patterns=')[1].split('*/')[0])
                } catch (err) {
                    console.error('Syntax error: ' + swaggerObj + '.patterns' + aData.split(swaggerObj + '.patterns')[1].split('*/')[0])
                    console.error(err)
                    return resolve(false)
                }
                regex = ''
                patterns.forEach(pattern => {
                    if (!firstPattern)
                        firstPattern = pattern
                    regex += `( |\\t|\\n|;|\\*\\/)${pattern}.get\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.head\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.post\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.put\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.delete\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.patch\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.options\\s*\\(|`
                })
                regex = regex.slice(0, -1)
            } else {
                // Automatic pattern recognition

                let serverVars = []
                let patterns = new Set()

                serverVars = aData.split(new RegExp(regex))
                if (serverVars && serverVars.length > 1)
                    serverVars.forEach(pattern => {
                        let auxPattern = (pattern.split(new RegExp(regex))[0].split(/\n| |\t|';'|\{|\}|\(|\)|\[|\]/).splice(-1)[0])  // ex.: app, route, server, etc.      
                        if (auxPattern && auxPattern != '')
                            patterns.add(auxPattern)
                    })

                regex = ''
                patterns.forEach(pattern => {
                    if (!firstPattern)
                        firstPattern = pattern
                    regex += `( |\\t|\\n|;|\\*\\/)${pattern}.get\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.head\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.post\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.put\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.delete\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.patch\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.options\\s*\\(|`
                })
                regex = regex.slice(0, -1)
                patternsServer = patterns
            }

            let aForcedsEndpoints = swaggerTags.getForcedEndpoints(aData)
            aForcedsEndpoints = aForcedsEndpoints.map(forced => {
                return forced += "\n" + unusualString + "FORCED" + unusualString + "\n"
            })

            aData = await addReferenceToMethods(aData, firstPattern)
            const aDataRaw = aData

            // Getting the reference of all files brought with 'import' and 'require'
            var importedFiles = getImportedFiles(aDataRaw)

            // Recursive call to other files
            if (importedFiles && importedFiles.length > 0) {
                for (var impIdx = 0; impIdx < importedFiles.length; ++impIdx) {
                    var extension = await getExtension(importedFiles[impIdx].fileName)
                    var routed = await verifyRouteInFile(importedFiles[impIdx].fileName + extension)
                    importedFiles[impIdx].varRoute = routed
                }
            }
            if (regex != '') { // Some pattern was found like: .get, .post, etc.
                aData = [...aData.split(new RegExp(regex)), ...aForcedsEndpoints]
                aData[0] = undefined    // Delete 'header' in file
                aData = aData.filter(data => {
                    if (data && data.replaceAll('\n', '').replaceAll(' ', '').replaceAll('\t', '') != '')
                        return true
                    return false
                })

                var elemBKP = null
                for (let idxElem = 0; idxElem < aData.length; idxElem++) {
                    var elem = aData[idxElem]
                    if (!elem) continue

                    let verifyPath = elem.split(',')
                    if (verifyPath.length == 1 || (!verifyPath[0].includes('\"') && !verifyPath[0].includes('\'') && !verifyPath[0].includes('\`')))
                        continue

                    let objEndpoint = {}
                    let path = false
                    let method = false
                    let auxMethod = false
                    let req = null
                    let res = null
                    let next = null
                    let autoMode = true
                    let objParameters = {}
                    let objResponses = {}
                    let forced = false

                    if (elem.includes('[_[') && elem.includes(']_]')) {
                        elem = elem.split(new RegExp("\\[_\\[|\\]_\\]\\)\\("))
                        auxMethod = elem[1]
                        elem = elem[2]
                    }

                    elem = getFunction(elem)
                    if (elem.includes(unusualString + "FORCED" + unusualString))
                        forced = true

                    if (swaggerTags.getIgnoreTag(elem))
                        continue

                    autoMode = swaggerTags.getAutoTag(elem)

                    let middleware = false
                    let completedAnalysis = false
                    // Checking if function is a reference to another file
                    if (elem.split(",").length > 1) {
                        var auxElem = await removeComments(elem)
                        auxElem = auxElem.replaceAll('\n', '').replaceAll(' ', '')
                        // Verifing foo.method('/path', [..., ..., ...], ...)
                        if (auxElem.split(",").length > 2 && auxElem.split(",")[1].includes("[")) {
                            auxElem = auxElem.split(/\[|\]/)
                            // TODO: Verify middleares in array here, such as: foo.method('/path', [... , ... , ...], foo)
                            elem = auxElem[0]
                            auxElem = auxElem[2].split(",")
                            auxElem.shift()
                            auxElem = auxElem.join(',')
                            if (auxElem.split(new RegExp(`\\s*\\=*\\s*\\(.+\\).+\\{`))) {
                                completedAnalysis = true
                                elem += auxElem
                            }

                        } else {
                            auxElem = auxElem.split(",")[1]
                            if (auxElem.split(new RegExp("(\\,|\\(|\\)|\\{|\\}|\\[|\\])")).length == 1)
                                middleware = true
                        }

                        if (!completedAnalysis) {
                            var refFuncao = null
                            var varFileName = null
                            auxElem = auxElem.split(/\)|\n/)

                            if ((auxElem.length > 1 || middleware) && !auxElem[0].includes("function ") && !auxElem[0].includes("=>")) {
                                auxElem = auxElem[0]
                                if (auxElem.split(".").length > 1) {// Identificando referencia de subfuncao
                                    refFuncao = auxElem.split(".")[1].trim()
                                    varFileName = auxElem.split(".")[0].trim()
                                } else {
                                    varFileName = auxElem.split(".")[0].trim()
                                }
                                var idx = importedFiles.findIndex(e => e.varFileName == varFileName)
                                // Referenced in another file
                                if (idx > -1) {
                                    // Bringing reference
                                    var pathFile = null
                                    if (relativePath) {
                                        if (importedFiles[idx].fileName.includes("../")) {
                                            var foldersToBack = importedFiles[idx].fileName.split("../").length - 1
                                            var RelativePathBacked = relativePath.split('/')
                                            RelativePathBacked = RelativePathBacked.slice(0, (-1) * foldersToBack)
                                            RelativePathBacked = RelativePathBacked.join('/')

                                            pathFile = RelativePathBacked + '/' + importedFiles[idx].fileName.replaceAll('../', '')//.replaceAll('//', '/')
                                        } else {
                                            pathFile = relativePath + importedFiles[idx].fileName.replaceAll('./', '/')
                                        }
                                    } else {
                                        pathFile = importedFiles[idx].fileName
                                    }
                                    var extension = await getExtension(pathFile)
                                    var refFunction = await getReferencedFunction(pathFile + extension, refFuncao)

                                    // TODO: Verify case with more than one referenced subfunction, such as: Foo.func1.func2...
                                    // Replacing function in the referenced location
                                    if (refFunction)
                                        elem += unusualString + "," + refFunction
                                } else {
                                    // Referenced in the same file
                                    var refFunction = await functionRecognizer(aDataRaw, varFileName)
                                    elem += unusualString + "," + refFunction
                                }
                            }
                        }
                    }

                    elemBKP = elem
                    elem = elem.replaceAll('\n', '').replaceAll('/*', '\n').replaceAll('*/', '\n').replaceAll(swaggerObj, '\n' + swaggerObj)
                    const aElem = elem.split(/;|\n/)
                    for (var _idx in aElem) {
                        const line = aElem[_idx]

                        if (!path) {
                            path = pathRoute + swaggerTags.getPath(elem, line, autoMode)
                            objEndpoint[path] = {}
                        }
                        if (!method) {
                            method = swaggerTags.getMethod(elem, line.includes(unusualString) ? line.split(unusualString)[0] : line, autoMode, aDataRaw) //line.includes(unusualString) esta presente quando uma funcao eh refenrenciada
                            if (auxMethod)
                                method = auxMethod
                            objEndpoint[path][method] = {}
                            objEndpoint[path][method].tags = []
                            objEndpoint[path][method].description = ''
                            objEndpoint[path][method].parameters = []
                            objEndpoint[path][method].responses = {}

                            if (path.includes('_undefined_path_0x'))
                                objEndpoint[path][method].tags.push({ name: 'Endpoints without path or method' })
                        }

                        // Geting callback parameters: 'req', 'res' and 'next'
                        if (autoMode && !req && !res) {
                            if (forced) {
                                // TODO: Verify 'req'?
                                res = elem.split(/([a-zA-Z]*|[0-9]|\_|\-)*\.status\(/)
                                if (res[1] && res[1] != '')
                                    res = res[1]
                                else
                                    res = null
                            } else {
                                const callbackParameters = getCallbackParameters(line.includes(unusualString) ? line.split(unusualString)[1] : line)
                                req = callbackParameters.req
                                res = callbackParameters.res
                                next = callbackParameters.next
                            }
                        }

                        if ((!path || !method))
                            throw console.error("\nError: 'path' or 'method' not found.")

                        if (autoMode)// Checking parameters in the path
                            objParameters = getPathParameters(path, objParameters)

                        let paramName = null
                        if (line.includes(swaggerObj + '.'))
                            paramName = line.getBetweenStrs(swaggerObj + ".", "=").trim()

                        if (paramName && paramName.includes('parameters') && paramName.includes('[') && paramName.includes(']')) {
                            objParameters = swaggerTags.getParametersTag(line, paramName, objParameters)    // Search for #swagger.parameters
                        } else if (paramName && paramName.includes('produces')) {
                            objEndpoint = swaggerTags.getProducesTag(line, objEndpoint, path, method)       // Search for #swagger.produces
                        } else if (paramName && paramName.includes('consumes')) {
                            objEndpoint = swaggerTags.getConsumesTag(line, objEndpoint, path, method)       // Search for #swagger.consumes
                        } else if (paramName && paramName.includes('responses') && paramName.includes('[') && paramName.includes(']')) {
                            objResponses = swaggerTags.getResponsesTag(line, paramName, objResponses)       // Search for #swagger.responses
                        } else if (paramName) {
                            try {
                                objEndpoint[path][method][paramName] = eval(`(${line.split('=')[1]})`)
                            } catch (err) {
                                console.error('Syntax error: ' + line)
                                console.error(err)
                                return resolve(false)
                            }
                        }
                        if (objResponses === false || objParameters === false || objEndpoint === false)
                            return resolve(false)
                    }

                    // req | res: Last, because must eliminate comments and strings to get .status only from the code.
                    if (autoMode && (req || res)) {
                        elem = await removeComments(elem, true)
                        // elem = elem.split(new RegExp("/\\*(.)*?\\*/")).filter((_, idx) => idx % 3 == 0).join('')    // Delete all comments /*...*/
                        // elem = elem.split(new RegExp("([\"'`])((?:\\\\\\1|.)*?)\\1")).filter((_, idx) => idx % 3 == 0).join('')  // Delete all string 
                        elem = elem.replaceAll('__¬¬¬__', '"')
                        if (req) {
                            objParameters = getQuery(elem, req, objParameters)              // Search for parameters in the query (directy)
                            objParameters = getQueryIndirecty(elem, req, objParameters)     // Search for parameters in the query (indirecty)
                        }
                        if (res) {
                            objResponses = getStatus(elem, res, objResponses)               // Search for response status
                            objEndpoint = getHeader(elem, path, method, res, objEndpoint)   // Search for resonse header
                        }
                    }

                    Object.values(objParameters).forEach(o => objEndpoint[path][method].parameters.push(o))
                    objEndpoint[path][method].responses = objResponses
                    delete objEndpoint[path][method].path
                    delete objEndpoint[path][method].method
                    if (paths[path]) // Allow get, post, etc, in same path
                        paths[path] = { ...paths[path], ...objEndpoint[path] }
                    else
                        paths = { ...paths, ...objEndpoint }
                }
            }
            elem = elemBKP
            const router = swaggerTags.getRouter(aDataRaw)

            let regexRouter = `\\s*.*\\.use\\s*\\(`
            let aDataRawCleaned = await removeComments(aDataRaw, true)
            var aRoutes = aDataRawCleaned.split(new RegExp(regexRouter))
            if (aRoutes.length > 1) {
                aRoutes.shift()   // remove the first element
                var allPaths = {}
                for (let file = 0; file < aRoutes.length; file++) {
                    var obj = { path: null, varFileName: null, fileName: null }
                    var r = aRoutes[file]
                    var data = r.split(')')[0]

                    if (data.split(',').length == 1) { // route with 1 parameter
                        obj.path = ''
                        obj.varFileName = data
                        obj.varFileName = obj.varFileName.replaceAll('(', '').replaceAll(')', '').replaceAll(' ', '')
                    } else if (data.split(',').length == 2) { // route with 2 parameters
                        obj.path = data.split(',')[0]
                        obj.path = obj.path.getBetweenStrs("\`", "\`") || obj.path.getBetweenStrs("\'", "\'") || obj.path.getBetweenStrs("\"", "\"")
                        obj.varFileName = data.split(',')[1]
                        obj.varFileName = obj.varFileName.replaceAll('(', '').replaceAll(')', '').replaceAll(' ', '')
                    } else {
                        // TODO: route with 3 parameters
                    }

                    var idx = importedFiles.findIndex(e => e.varFileName == obj.varFileName)
                    if (idx > -1) {
                        if (relativePath)
                            obj.fileName = relativePath + importedFiles[idx].fileName.replaceAll('./', '/') // TODO: tratar caso ../ ?
                        else
                            obj.fileName = importedFiles[idx].fileName

                        var auxRelativePath = obj.fileName.split('/')
                        auxRelativePath.pop()
                        auxRelativePath = auxRelativePath.join('/')
                        var extension = await getExtension(obj.fileName)

                        var auxPaths = await readEndpointFile(obj.fileName + extension, (obj.path || ''), auxRelativePath)
                        allPaths = { ...paths, ...allPaths, ...auxPaths }
                    } else {
                        // Referenced in the same file. 
                        // TODO: Check if necessary
                    }
                    if (file == aRoutes.length - 1)
                        return resolve(allPaths)
                }
            }
            return resolve(paths)
        })
    })
}


function getImportedFiles(aDataRaw) {
    var importedFiles = []
    var importeds = aDataRaw.split(new RegExp(`import`, "i"))
    var requireds = aDataRaw.split(new RegExp(`const|var|let\\s*`, "i"))
    requireds = requireds.filter(e => e.split(new RegExp(`=\\s*require\\s*\\(`, "i")).length > 1)

    if (importeds && importeds.length > 1) {
        importeds.shift()
        importeds.forEach(imp => {
            var obj = { varFileName: null, fileName: null }
            var varFileName = imp.split(new RegExp(`from`, "i"))[0].trim()
            if (varFileName.includes('{')) {
                //TODO: Verify case with multiple calls on 'import', such as: {foo, foo2, ...}
            } else {
                obj.varFileName = varFileName
            }

            var fileName = imp.split(new RegExp(";|\n"))[0].trim()
            if (fileName && fileName.split(new RegExp(`from`, "i")).length > 1) {
                fileName = fileName.split(new RegExp(`from`, "i"))[1].trim()
            }
            fileName = fileName.replaceAll('\'', '').replaceAll('\"', '').replaceAll('\`', '').replaceAll(' ', '')
            // Captures only local files
            if (fileName.includes("./")) {
                obj.fileName = fileName
                importedFiles.push(obj)
            }
        })
    }

    if (requireds && requireds.length > 0) {
        requireds.forEach(req => {
            var obj = { varFileName: null, fileName: null }
            var varFileName = req.split(new RegExp(`=\\s*require\\s*\\(`, "i"))[0].trim()
            obj.varFileName = varFileName

            var fileName = req.split(new RegExp(`=\\s*require\\s*\\(`, "i"))[1].trim()
            fileName = fileName.split(")")[0]
            fileName = fileName.replaceAll('\'', '').replaceAll('\"', '').replaceAll('\`', '').replaceAll(' ', '')

            // Captures only local files
            if (fileName.includes("./")) {
                if (fileName.split(new RegExp(`.json`, "i")).length == 1) { // Will not recognize files with .json extension
                    obj.fileName = fileName
                    importedFiles.push(obj)
                }
            }
        })
    }
    return importedFiles
}

function getReferencedFunction(fileName, refFuncao) {
    return new Promise((resolve, reject) => {
        fs.readFile(fileName, 'utf8', async function (err, data) {
            if (err) return resolve(null)

            var cleanedData = await removeComments(data, true)
            cleanedData = cleanedData.replaceAll(" async ", ' ')

            if (refFuncao) { // When file has more than one exported function
                var funcStr = await functionRecognizer(cleanedData, refFuncao)
                return resolve(funcStr)
            } else { // When file has only one exported function
                cleanedData = cleanedData.replaceAll('\n', ' ').replaceAll('  ', ' ').replaceAll('  ', ' ')
                var directPattern = cleanedData.split(new RegExp(`module\\.exports\\s*\\=*\\s*\\(.+\\).+\\{`))
                if (directPattern.length > 1)
                    directPattern = true
                else
                    directPattern = false

                if (directPattern) { // Direct declaration in module.exports
                    var funcStr = await functionRecognizer(cleanedData, `module\\.exports`)
                    return resolve(funcStr)
                } else { // Indirect declaration in module.exports
                    var funcName = cleanedData.split(new RegExp("module\\.exports\\s*\\n*\\s*\\=\\s*\\n*\\s*"))
                    if (funcName[1])
                        funcName = funcName[1].split(/\n| |\t|\;|\{|\}|\(|\)|\[|\]/)
                    else
                        return resolve(null)    // TODO: Verify 'null' case 
                    var funcStr = await functionRecognizer(cleanedData, funcName[0])
                    return resolve(funcStr)
                }
            }
            //TODO: Verifify 'export default'
        })
    })
}

async function functionRecognizer(data, refFuncao, regex) {
    return new Promise((resolve, reject) => {
        var func = null
        func = data.split(new RegExp(`(${refFuncao}\\s*\\=*\\s*\\(.+\\).*\\{)`))
        func.shift()
        func = func.join(' ')
        var func2 = data.split(new RegExp(`${refFuncao}\\s*\\=*\\s*\\(.+\\).*\\{`))

        if (func.length > 1) {
            if (func.split('{').length == 1) {
                // TODO: Verify case without {, for example: func => func(...);
            } else {
                func = func.split('{')
                func.shift()
                func = func.join('{')
                var funcData = func.split("")
                var stack = 1
                var funcStr = data.split(new RegExp(`${refFuncao}\\s*\\=*\\s*\\(`))[1]
                if (funcStr.split('}').length > 1)
                    funcStr = funcStr.split('{')[0]
                funcStr = '(' + funcStr + '=> {'    // TODO: Verify case 'funcStr' with '=> =>'
                for (let idx = 0; idx < funcData.length; idx++) {
                    var c = funcData[idx]
                    if (c == "{")
                        stack += 1
                    else if (c == "}")
                        stack -= 1
                    funcStr += c
                    if (stack == 0)
                        return resolve(funcStr)
                }
            }
        } else
            return resolve(null)
    })
}

function verifyRouteInFile(fileName) {
    return new Promise((resolve, reject) => {
        fs.readFile(fileName, 'utf8', async function (err, data) {
            const router = swaggerTags.getRouter(data)
            if (router)
                return resolve(router)
            return resolve(null)
        })
    })
}

function removeComments(data, keepSwaggerTags = false) {
    return new Promise((resolve, reject) => {

        var strToReturn = ''
        var stackComment1 = 0; // For type  //
        var stackComment2 = 0; // For type  /* */

        var buffer1 = '' // For type  //
        var buffer2 = '' // For type   /* */

        for (var idx = 0; idx < data.length; ++idx) {
            let c = data[idx]

            // Type //
            if (c == '/' && data[idx + 1] == '/' && stackComment1 == 0 && stackComment2 == 0)
                stackComment1 = 1
            if (c == '\n' && stackComment1 == 1)
                stackComment1 = 2

            // Type  /* */
            if (c == '/' && data[idx + 1] == '*' && stackComment1 == 0 && stackComment2 == 0)
                stackComment2 = 1
            if (c == '/' && data[idx - 1] == '*' && stackComment2 == 1)
                stackComment2 = 2

            if (stackComment1 == 0 && stackComment2 == 0) {
                strToReturn += c
            } else if (stackComment1 == 1 || stackComment1 == 2) { // Keeps the comment being ignored. Like: //
                buffer1 += c
            } else if (stackComment2 == 1 || stackComment2 == 2) { // Keeps the comment being ignored. Like: /* */
                buffer2 += c
            }

            if (stackComment1 == 2) {
                stackComment1 = 0
                if (buffer1.includes('#swagger.') && keepSwaggerTags) {
                    strToReturn += buffer1  // keeping the comment that has a swagger tag
                    buffer1 = ''
                } else
                    buffer1 = ''
            }

            if (stackComment2 == 2) {
                stackComment2 = 0
                if (buffer2.includes('#swagger.') && keepSwaggerTags) {
                    strToReturn += buffer2  // keeping the comment that has a swagger tag
                    buffer2 = ''
                } else
                    buffer2 = ''
            }

            if (idx == data.length - 1) {
                strToReturn = strToReturn.replaceAll('  ', ' ').replaceAll('  ', ' ').replaceAll('  ', ' ').replaceAll('  ', ' ')
                return resolve(strToReturn)
            }
        }

    })

}

function getExtension(fileName) {
    return new Promise(async (resolve, reject) => {
        var data = fileName.split('.').slice(-1)[0].toLowerCase()
        if (data == 'js' || data == 'ts' || data == 'jsx' || data == 'jsx')
            return resolve('')

        var extensios = ['.js', '.ts', '.jsx', '.tsx']

        for (var idx = 0; idx < extensios.length; ++idx) {
            if (await fs.existsSync(fileName + extensios[idx]))
                return resolve(extensios[idx])

            if (idx == extensios.length - 1)
                return resolve('')
        }

    })
}

function addReferenceToMethods(data, pattern) {
    return new Promise((resolve, reject) => {
        let auxData = data

        // Tratando caso: router.route('/user').get(authorize, (req, res) => {
        let aDataRoute = auxData.split(new RegExp(".*\\.route\\s*\\("))
        if (aDataRoute.length > 1) {

            for (var idx = 1; idx < aDataRoute.length; ++idx) {
                // app.get([_[get]_])('/automatic1/users/:id', (req, res) => {
                for (var mIdx = 0; mIdx < METHODS.length; ++mIdx) {
                    let method = METHODS[mIdx]
                    let line = aDataRoute[idx].split(new RegExp(`\\)(\\s*|\\n*)\\.${method}\\s*\\(`))
                    if (line.length === 3) {
                        aDataRoute[idx] = (pattern || '_app') + `.${method}(` + line[0] + ',' + line[2]
                        break
                    }
                }
            }
            auxData = aDataRoute.join('\n')
        }

        for (var idx = 0; idx < METHODS.length; ++idx) {
            let method = METHODS[idx]
            let regexMethods = `.*\\.${method}\\s*\\(`
            auxData = auxData.split(new RegExp(regexMethods))
            auxData = auxData.join((pattern || '_app') + `.${method}([_[${method}]_])(`)

            if (idx == METHODS.length - 1) {
                return resolve(auxData)
            }
        }

    })
}

