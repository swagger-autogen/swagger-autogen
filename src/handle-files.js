const fs = require('fs')
const swaggerTags = require('./swagger-tags')
const handleData = require('./handle-data')
const statics = require('./statics')


function readEndpointFile(filePath, pathRoute = '', relativePath) {
    return new Promise((resolve, reject) => {
        let paths = {}
        fs.readFile(filePath, 'utf8', async function (err, data) {
            if (err) throw console.error(err)
            let regex = "\\.use\\s*\\(|\\.get\\s*\\(|\\.head\\s*\\(|\\.post\\s*\\(|\\.put\\s*\\(|\\.delete\\s*\\(|\\.patch\\s*\\(|\\.options\\s*\\("
            let aData = await handleData.removeComments(data, true)
            aData = handleData.clearData(aData)
            let firstPattern = null
            if (aData.includes(statics.SWAGGER_TAG + '.patterns')) { // Manual pattern recognition
                let patterns = null
                try {  // Handling syntax error
                    patterns = eval(aData.replaceAll(' ', '').split(statics.SWAGGER_TAG + '.patterns=')[1].split('*/')[0])
                } catch (err) {
                    console.error('Syntax error: ' + statics.SWAGGER_TAG + '.patterns' + aData.split(statics.SWAGGER_TAG + '.patterns')[1].split('*/')[0])
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
                return forced += "\n" + statics.STRING_BREAKER + "FORCED" + statics.STRING_BREAKER + "\n"
            })

            aData = await handleData.addReferenceToMethods(aData, firstPattern)
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

                    elem = await handleData.stackSymbolRecognizer(elem, '(', ')')
                    if (elem.includes(statics.STRING_BREAKER + "FORCED" + statics.STRING_BREAKER))
                        forced = true

                    if (swaggerTags.getIgnoreTag(elem))
                        continue

                    autoMode = swaggerTags.getAutoTag(elem)
                    const elemOrig = elem

                    // Handling passed functions in the parameter
                    if (elem.split(",").length > 1 && !forced) {
                        var functions = []
                        let middlewares = null
                        let callbackIsSetted = false
                        var auxElem = await handleData.removeComments(elem)
                        let functionsInParameters = auxElem.split('')
                        if (functionsInParameters.slice(-1)[0] == ')') // if last elem is ')'
                            functionsInParameters = functionsInParameters.slice(0, -1)
                        functionsInParameters = functionsInParameters.join('').split(',')

                        auxElem = auxElem.replaceAll('\n', '').replaceAll(' ', '')
                        // Handling foo.method('/path', [..., ..., ...], ...)
                        if (auxElem.split(",").length > 2 && auxElem.split(",")[1].includes("[")) {
                            auxElemArray = [...functionsInParameters]
                            auxElemArray.shift()
                            auxElemArray = auxElemArray.join(',')
                            auxElemArray = auxElemArray.split('[')
                            auxElemArray.shift()
                            auxElemArray = auxElemArray.join('[')
                            middlewares = ('[' + await handleData.stackSymbolRecognizer(auxElemArray, '[', ']')).trim()
                            auxElem = functionsInParameters.join(',').split(middlewares)
                            elem = auxElem[0]
                            auxElem = auxElem[1].split(",")
                            auxElem.shift()
                            auxElem = auxElem.join(',')

                            // Handling Callback
                            if (auxElem.split(new RegExp("(\\,|\\(|\\)|\\{|\\}|\\[|\\]|\\s*function\\s*|\\s*=>\\s*)")).length != 1) {
                                // Getting function not referenced
                                const callbackOrig = elemOrig.split(middlewares)
                                if (callbackOrig.length > 1)
                                    elem += statics.STRING_BREAKER + callbackOrig[1]
                                else
                                    elem += statics.STRING_BREAKER + "," + auxElem
                                callbackIsSetted = true
                            } else {
                                // Getting referenced function 
                                functions.push(auxElem.replaceAll(' ', '').replaceAll('\n', ''))
                            }

                            // Handling middlewares array
                            if (middlewares[0] == '[' && middlewares.slice(-1)[0] == ']') { // Is Array
                                middlewares = middlewares.slice(1, -1)
                                let auxMiddlewares = middlewares
                                auxMiddlewares = auxMiddlewares.split(',')
                                for (let index = 0; index < auxMiddlewares.length; ++index) {
                                    let midd = auxMiddlewares[index].trim()
                                    if (midd.split(new RegExp("(\\,|\\(|\\)|\\{|\\}|\\[|\\]|\\s*function\\s*|\\s*=>\\s*)")).length == 1) {
                                        // Getting referenced function 
                                        functions.push(midd.replaceAll(' ', '').replaceAll('\n', ''))
                                    }
                                }
                            }

                        } else if (auxElem.split(",").length > 1) { // Handling: foo.method('/path', middleware, controller)'
                            // Getting function not referenced
                            let functionArray = elemOrig.split(',')
                            elem = functionArray[0]
                            functionArray.shift()
                            functionArray = functionArray.join(',')
                            let func1 = await handleData.popFunction(functionArray)
                            if (func1) {
                                functionArray = functionArray.split(func1)
                                functionArray = functionArray.join('')
                                elem += ',' + statics.STRING_BREAKER + "," + func1
                                let func2 = await handleData.popFunction(functionArray)
                                if (func2)
                                    elem += "," + func2
                            }

                            for (let index = 1; index < functionsInParameters.length; ++index) {
                                let func = functionsInParameters[index]
                                if (!func)
                                    continue

                                if (func.split(new RegExp("(\\,|\\(|\\)|\\{|\\}|\\[|\\]|\\s*function\\s*|\\s*=>\\s*)")).length == 1) {
                                    // Getting referenced function 
                                    functions.push(func.replaceAll(' ', '').replaceAll('\n', ''))
                                }
                            }
                        }

                        for (var index = 0; index < functions.length; index++) {
                            let func = functions[index]
                            var refFuncao = null
                            var varFileName = null
                            if (func.split(".").length > 1) {// Identifying subfunction reference
                                refFuncao = func.split(".")[1].trim()
                                varFileName = func.split(".")[0].trim()
                            } else {
                                varFileName = func.split(".")[0].trim()
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
                                var refFunction = await functionRecognizerInFile(pathFile + extension, refFuncao)

                                // Replacing function in the referenced location
                                if (refFunction) {
                                    refFunction = handleData.clearData(refFunction)
                                    if (middlewares && middlewares.includes(func)) {
                                        middlewares = middlewares.replace(func, refFunction)
                                    } else {
                                        if (index == 0 && !callbackIsSetted)
                                            elem += statics.STRING_BREAKER + "," + refFunction
                                        else
                                            elem += "," + refFunction
                                    }
                                }
                            } else {
                                // Referenced in the same file
                                var refFunction = await handleData.functionRecognizerInData(aDataRaw, varFileName)
                                if (refFunction) {
                                    refFunction = handleData.clearData(refFunction)
                                    if (middlewares && middlewares.includes(func)) {
                                        middlewares = middlewares.replace(func, refFunction)
                                    } else {
                                        if (index == 0 && !callbackIsSetted)
                                            elem += statics.STRING_BREAKER + "," + refFunction
                                        else
                                            elem += "," + refFunction
                                    }
                                }
                            }
                        }
                        if (middlewares)
                            elem += "," + middlewares
                    }

                    // TODO: Optimize this. 
                    // Concatenates all original content at the end to recognize the swagger tags 
                    // declared outside the middleware and callback functions, such as: 
                    // routes.get('/path', /* #swagger.tags = ['Tool'] */ [middleware], callback);
                    elem += statics.STRING_BREAKER + "," + elemOrig

                    elemBKP = elem
                    elem = elem.replaceAll('\n', '').replaceAll('/*', '\n').replaceAll('*/', '\n').replaceAll(statics.SWAGGER_TAG, '\n' + statics.SWAGGER_TAG)
                    const aElem = elem.split(/;|\n/)
                    for (var _idx in aElem) {
                        const line = aElem[_idx]
                        if (!path) {
                            path = pathRoute + swaggerTags.getPath(elem, line, autoMode)
                            objEndpoint[path] = {}
                        }
                        if (!method) {
                            method = swaggerTags.getMethod(elem, line.includes(statics.STRING_BREAKER) ? line.split(statics.STRING_BREAKER)[0] : line, autoMode, aDataRaw) //line.includes(statics.STRING_BREAKER) esta presente quando uma funcao eh refenrenciada
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
                                res = elem.split(/([a-zA-Z]*|[0-9]|\_|\-)*\.status\(/)
                                if (res[1] && res[1] != '')
                                    res = res[1]
                                else
                                    res = null
                            } else {
                                const callbackParameters = handleData.getCallbackParameters(line.includes(statics.STRING_BREAKER) ? line.split(statics.STRING_BREAKER)[1] : line)
                                req = callbackParameters.req
                                res = callbackParameters.res
                                next = callbackParameters.next
                            }
                        }

                        if ((!path || !method))
                            throw console.error("\nError: 'path' or 'method' not found.")

                        if (autoMode)// Checking parameters in the path
                            objParameters = handleData.getPathParameters(path, objParameters)

                        let paramName = null
                        if (line.includes(statics.SWAGGER_TAG + '.'))
                            paramName = line.getBetweenStrs(statics.SWAGGER_TAG + ".", "=").trim()

                        if (paramName && paramName.includes('parameters') && paramName.includes('[') && paramName.includes(']')) {
                            objParameters = swaggerTags.getParametersTag(line, paramName, objParameters)    // Search for #swagger.parameters
                        } else if (paramName && paramName.includes('produces')) {
                            objEndpoint = swaggerTags.getProducesTag(line, objEndpoint, path, method)       // Search for #swagger.produces
                        } else if (paramName && paramName.includes('consumes')) {
                            objEndpoint = swaggerTags.getConsumesTag(line, objEndpoint, path, method)       // Search for #swagger.consumes
                        } else if (paramName && paramName.includes('responses') && paramName.includes('[') && paramName.includes(']')) {
                            objResponses = swaggerTags.getResponsesTag(line, paramName, objResponses)       // Search for #swagger.responses
                        } else if (paramName) {
                            try {   // #swagger.description, etc
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

                    // req | res: Is the last, because must eliminate comments and strings to get .status only from the code.
                    // TODO: req and res, create arrays with all variables, such as: ['res', 'response']
                    if (autoMode && (req || res)) {
                        elem = await handleData.removeStrings(elem) // Avoiding .status(...), etc in string
                        elem = elem.replaceAll('__¬¬¬__', '"')
                        if (req) {
                            objParameters = handleData.getQuery(elem, req, objParameters)              // Search for parameters in the query (directy)
                            objParameters = handleData.getQueryIndirecty(elem, req, objParameters)     // Search for parameters in the query (indirecty)
                        }
                        if (res) {
                            objResponses = handleData.getStatus(elem, res, objResponses)               // Search for response status
                            objEndpoint = handleData.getHeader(elem, path, method, res, objEndpoint)   // Search for resonse header
                        }
                    }

                    Object.values(objParameters).forEach(o => objEndpoint[path][method].parameters.push(o))
                    objEndpoint[path][method].responses = objResponses

                    if (objEndpoint[path][method].produces) {
                        let uniqueProduces = new Set()
                        objEndpoint[path][method].produces.map(p => uniqueProduces.add(p.toLowerCase()))
                        objEndpoint[path][method].produces = [...uniqueProduces]
                    }

                    if (objEndpoint[path][method].consumes) {
                        let uniqueConsumes = new Set()
                        objEndpoint[path][method].consumes.map(p => uniqueConsumes.add(p.toLowerCase()))
                        objEndpoint[path][method].consumes = [...uniqueConsumes]
                    }

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
            let aDataRawCleaned = await handleData.removeComments(aDataRaw, true)
            var aRoutes = aDataRawCleaned.split(new RegExp(regexRouter))

            if (aRoutes.length > 1) {
                aRoutes.shift()
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
                        // TODO?: route with 3 parameters
                    }

                    var idx = importedFiles.findIndex(e => e.varFileName == obj.varFileName)
                    if (idx > -1) {
                        if (relativePath)
                            obj.fileName = relativePath + importedFiles[idx].fileName.replaceAll('./', '/')
                        else
                            obj.fileName = importedFiles[idx].fileName

                        var auxRelativePath = obj.fileName.split('/')
                        auxRelativePath.pop()
                        auxRelativePath = auxRelativePath.join('/')
                        var extension = await getExtension(obj.fileName)

                        var auxPaths = await readEndpointFile(obj.fileName + extension, (obj.path || ''), auxRelativePath)
                        allPaths = { ...paths, ...allPaths, ...auxPaths }
                    } else {
                        // Referenced in the same file. (TODO?)
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
                // TODO: Handling case with multiple calls on 'import', such as: {foo, foo2, ...}
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

function functionRecognizerInFile(fileName, refFuncao) {
    return new Promise((resolve, reject) => {
        fs.readFile(fileName, 'utf8', async function (err, data) {
            if (err)
                return resolve(null)

            var cleanedData = await handleData.removeComments(data, true)
            cleanedData = cleanedData.replaceAll(" async ", ' ')

            if (refFuncao) { // When file has more than one exported function
                var funcStr = await handleData.functionRecognizerInData(cleanedData, refFuncao)
                return resolve(funcStr)
            } else { // When file has only one exported function
                cleanedData = cleanedData.replaceAll('\n', ' ').replaceAll('  ', ' ').replaceAll('  ', ' ')
                var directPattern = cleanedData.split(new RegExp(`module\\.exports\\s*\\=*\\s*\\(.+\\).+\\{`))
                if (directPattern.length > 1)
                    directPattern = true
                else
                    directPattern = false

                if (directPattern) { // Direct declaration in module.exports
                    var funcStr = await handleData.functionRecognizerInData(cleanedData, `module\\.exports`)
                    return resolve(funcStr)
                } else { // Indirect declaration in module.exports
                    var funcName = cleanedData.split(new RegExp("module\\.exports\\s*\\n*\\s*\\=\\s*\\n*\\s*"))
                    if (funcName[1])
                        funcName = funcName[1].split(/\n| |\t|\;|\{|\}|\(|\)|\[|\]/)
                    else
                        return resolve(null)    // TODO: Verify 'null' case 
                    var funcStr = await handleData.functionRecognizerInData(cleanedData, funcName[0])
                    return resolve(funcStr)
                }
            }
            // TODO: Verifify 'export default'
        })
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

module.exports = {
    readEndpointFile,
    getExtension
}