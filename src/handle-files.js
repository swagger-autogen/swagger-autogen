const fs = require('fs')
const swaggerTags = require('./swagger-tags')
const handleData = require('./handle-data')
const statics = require('./statics')


function readEndpointFile(filePath, pathRoute = '', relativePath, routeMiddleware) {
    return new Promise((resolve, reject) => {
        let paths = {}
        fs.readFile(filePath, 'utf8', async function (err, data) {
            if (err) throw console.error(err)
            // TODO: refactor this. Loop to build string?
            let regex = "\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*use\\s*\\n*\\t*\\s*\\n*\\t*\\(|" +
                "\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*get\\s*\\n*\\t*\\s*\\n*\\t*\\(|" +
                "\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*head\\s*\\n*\\t*\\s*\\n*\\t*\\(|" +
                "\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*post\\s*\\n*\\t*\\s*\\n*\\t*\\(|" +
                "\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*put\\s*\\n*\\t*\\s*\\n*\\t*\\(|" +
                "\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*delete\\s*\\n*\\t*\\s*\\n*\\t*\\(|" +
                "\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*patch\\s*\\n*\\t*\\s*\\n*\\t*\\(|" +
                "\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*options\\s*\\n*\\t*\\s*\\n*\\t*\\("
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
                    // TODO: refactor this. Loop to build string?
                    regex += `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*get\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*head\\s*\\n*\\t*\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*post\\s*\\n*\\t*\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*put\\s*\\n*\\t*\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*delete\\s*\\n*\\t*\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*patch\\s*\\n*\\t*\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*options\\s*\\n*\\t*\\s*\\n*\\t*\\(|`
                })
                regex = regex.slice(0, -1)
            } else {
                // Automatic pattern recognition
                let serverVars = []
                let patterns = new Set()
                serverVars = aData.split(new RegExp(regex))
                if (serverVars && serverVars.length > 1)
                    serverVars.forEach(pattern => {
                        let auxPattern = (pattern.split(new RegExp(regex))[0].split(/\n|\s|\t|';'|\{|\}|\(|\)|\[|\]/).splice(-1)[0])  // ex.: app, route, server, etc.      
                        if (auxPattern && auxPattern != '')
                            patterns.add(auxPattern)
                    })

                regex = ''
                patterns.forEach(pattern => {
                    if (!firstPattern)
                        firstPattern = pattern
                    // TODO: refactor this. Loop to build string?
                    regex += `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*get\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*head\\s*\\n*\\t*\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*post\\s*\\n*\\t*\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*put\\s*\\n*\\t*\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*delete\\s*\\n*\\t*\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*patch\\s*\\n*\\t*\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*options\\s*\\n*\\t*\\s*\\n*\\t*\\(|`
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
            var importedFiles = await getImportedFiles(aDataRaw, relativePath)

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
                    let predefPath = false
                    let rawPath = false
                    let method = false
                    let predefMethod = false
                    let req = null
                    let res = null
                    let next = null
                    let autoMode = true
                    let objParameters = {}
                    let objResponses = {}
                    let forced = false

                    if (elem.includes('[_[') && elem.includes(']_]')) {
                        elem = elem.split(new RegExp("\\[_\\[|\\]_\\]\\)\\("))
                        predefMethod = elem[1]
                        elem = elem[2]
                        predefPath = swaggerTags.getPath(elem, null, autoMode)
                        elem = elem.trim()
                        const quotMark = elem[0]
                        if ((quotMark == '\"' || quotMark == '\'' || quotMark == '\`') && !elem.includes("#swagger.path") && elem.split(quotMark).length > 2) {
                            let elemAux = elem.replaceAll(`\\${quotMark}`, statics.STRING_BREAKER + "quotMark" + statics.STRING_BREAKER)
                            elemAux = elemAux.split(quotMark)
                            rawPath = elemAux[1]
                            rawPath = rawPath.replaceAll(statics.STRING_BREAKER + "quotMark" + statics.STRING_BREAKER, `\\${quotMark}`)
                        }

                        if (elem.includes("#swagger.path")) {
                            rawPath = pathRoute + swaggerTags.getPath(elem, null, autoMode)
                        }
                    }

                    elem = await handleData.stackSymbolRecognizer(elem, '(', ')')
                    if (elem.includes(statics.STRING_BREAKER + "FORCED" + statics.STRING_BREAKER))
                        forced = true

                    if (swaggerTags.getIgnoreTag(elem))
                        continue

                    autoMode = swaggerTags.getAutoTag(elem)
                    const elemOrig = elem

                    // Handling passed functions in the parameter
                    var elemParam = await handleData.removeStrings(elem)
                    elemParam = await handleData.removeComments(elemParam)
                    if (elemParam.split(",").length > 1 && !forced) {
                        var functions = []
                        let middlewares = null
                        let callbackIsSetted = false
                        var auxElem = await handleData.removeComments(elem)
                        auxElem = auxElem.replace(rawPath, "")
                        let functionsInParameters = auxElem
                        if (functionsInParameters.slice(-1)[0] == ')') // if last elem is ')'
                            functionsInParameters = functionsInParameters.slice(0, -1)
                        functionsInParameters = functionsInParameters.split(',')

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
                            if (auxElem.split(new RegExp("(\\,|\\(|\\)|\\{|\\}|\\[|\\]|\\s+function\\s+|\\(\\s*function\\s*\\(|\\s*\\t*\\s*\\t*=>\\s*\\t*\\s*\\t*)")).length != 1) {
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
                                    if (midd.split(new RegExp("(\\,|\\(|\\)|\\{|\\}|\\[|\\]|\\s+function\\s+|\\(\\s*function\\s*\\(|\\s*\\t*\\s*\\t*=>\\s*\\t*\\s*\\t*)")).length == 1) {
                                        // Getting referenced function 
                                        functions.push(midd.replaceAll(' ', '').replaceAll('\n', ''))
                                    }
                                }
                            }

                        } else if (auxElem.split(",").length > 1) { // Handling: foo.method('/path', middleware, controller)'
                            // Getting function not referenced
                            let functionArray = elemOrig.replace(rawPath, "").split(',')
                            elem = rawPath
                            functionArray.shift()
                            functionArray = functionArray.join(',')
                            let funcNotReferenced1 = await handleData.popFunction(functionArray)
                            if (funcNotReferenced1) {
                                functionArray = functionArray.split(funcNotReferenced1)
                                functionArray = functionArray.join('')
                                elem += ',' + statics.STRING_BREAKER + "," + funcNotReferenced1
                                let funcNotReferenced2 = await handleData.popFunction(functionArray)
                                if (funcNotReferenced2)
                                    elem += "," + funcNotReferenced2
                            }

                            for (let index = 1; index < functionsInParameters.length; ++index) {
                                let func = functionsInParameters[index]
                                if (!func)
                                    continue

                                if (func.split(new RegExp("(\\,|\\(|\\)|\\{|\\}|\\[|\\]|\\s+function\\s+|\\(\\s*function\\s*\\(|\\s*\\t*\\s*\\t*=>\\s*\\t*\\s*\\t*)")).length == 1) {
                                    // Getting referenced function 
                                    functions.push(func.replaceAll(' ', '').replaceAll('\n', ''))
                                } else {
                                    if (func) {
                                        const origFunc = func
                                        func = func.split(new RegExp("\\([\\s\\S]*\\)"))
                                        func[0] = func[0].replaceAll(' ', '').replaceAll('\n', '')
                                        var idx = importedFiles.findIndex(e => e.varFileName && func[0] && (e.varFileName == func[0]))
                                        var exportPath = null
                                        if (idx == -1) {
                                            importedFiles.forEach(imp => {
                                                if (exportPath)
                                                    return
                                                let found = imp && imp.exports ? imp.exports.find(e => e.varName && func[0] && (e.varName == func[0])) : null
                                                if (found) {
                                                    if (imp.isDirectory)
                                                        exportPath = found.path
                                                    else
                                                        exportPath = imp.fileName      // TODO: change variable name
                                                }
                                            })
                                        }

                                        if ((idx > -1 || exportPath) && func.length > 1 && func[0] != '') {
                                            elem = elem.replaceAll(origFunc, func[0])
                                            functions.push(func[0])
                                        }
                                    }
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
                            var idx = importedFiles.findIndex(e => e.varFileName && varFileName && (e.varFileName == varFileName))
                            var exportPath = null
                            if (idx == -1) {
                                importedFiles.forEach(imp => {
                                    if (exportPath)
                                        return
                                    let found = imp && imp.exports ? imp.exports.find(e => e.varName && varFileName && (e.varName == varFileName)) : null
                                    if (found) {
                                        if (!refFuncao)
                                            refFuncao = found.varName
                                        if (imp.isDirectory)
                                            exportPath = found.path
                                        else
                                            exportPath = imp.fileName      // TODO: change variable name
                                    }
                                })
                            }

                            // Referenced in another file
                            if (idx > -1 || exportPath) {
                                // Bringing reference
                                var pathFile = null
                                if (exportPath)
                                    pathFile = exportPath
                                else
                                    pathFile = importedFiles[idx].fileName
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
                    elem += statics.STRING_BREAKER + "," + elemOrig + (routeMiddleware ? "," + routeMiddleware : '')

                    elemBKP = elem
                    elem = elem.replaceAll('\n', '').replaceAll('/*', '\n').replaceAll('*/', '\n').replaceAll(statics.SWAGGER_TAG, '\n' + statics.SWAGGER_TAG)
                    const aElem = elem.split(/;|\n/)
                    for (var _idx in aElem) {
                        const line = aElem[_idx]
                        if (!path) {
                            path = pathRoute + swaggerTags.getPath(elemOrig, line, autoMode)
                            path = path.replaceAll('//', '/').replaceAll('//', '/').replaceAll('//', '/').replaceAll('//', '/')
                            objEndpoint[path] = {}
                        }
                        if (!method) {
                            method = swaggerTags.getMethod(elem, line.includes(statics.STRING_BREAKER) ? line.split(statics.STRING_BREAKER)[0] : line, autoMode, aDataRaw) //line.includes(statics.STRING_BREAKER) esta presente quando uma funcao eh refenrenciada
                            if (predefMethod)
                                method = predefMethod
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

                        if (autoMode && Object.entries(objParameters).length == 0)// Checking parameters in the path
                            objParameters = await handleData.getPathParameters(path, objParameters)

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
                            try {   // #swagger: description, tags, auto, method, path, etc
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
                    if (path.includes('/')) {
                        if (paths[path]) // Allow get, post, etc, in same path
                            paths[path] = { ...paths[path], ...objEndpoint[path] }
                        else
                            paths = { ...paths, ...objEndpoint }
                    }
                }
            }
            elem = elemBKP
            const router = swaggerTags.getRouter(aDataRaw)
            let aDataRawCleaned = await handleData.removeComments(aDataRaw, true)
            aDataRawCleaned = aDataRawCleaned.replaceAll('\n', ' ')
            var aRoutes = aDataRawCleaned.split(new RegExp(`\\s*\\t*\\s*\\t*\\w\\s*\\t*\\s*\\t*\\.\\s*\\t*\\s*\\t*use\\s*\\t*\\s*\\t*\\(`))

            if (aRoutes.length > 1) {
                aRoutes.shift()
                var allPaths = {}
                for (let file = 0; file < aRoutes.length; file++) {
                    var obj = { path: null, varFileName: null, middleware: null, fileName: null }
                    var r = aRoutes[file]
                    var data = r.split(')')[0]

                    if (data.split(',').length == 1) { // route with 1 parameter
                        // TODO: verify
                        obj.path = ''
                        obj.varFileName = data
                        obj.varFileName = obj.varFileName.replaceAll('(', '').replaceAll(')', '').replaceAll(' ', '')
                    } else if (data.split(',').length == 2) { // route with 2 parameters
                        obj.path = data.split(',')[0]
                        obj.path = obj.path.getBetweenStrs("\`", "\`") || obj.path.getBetweenStrs("\'", "\'") || obj.path.getBetweenStrs("\"", "\"")
                        obj.path = pathRoute + obj.path
                        obj.varFileName = data.split(',')[1]
                        obj.varFileName = obj.varFileName.replaceAll('(', '').replaceAll(')', '').replaceAll(' ', '')
                    } else {
                        obj.path = data.split(',')[0]
                        obj.path = obj.path.getBetweenStrs("\`", "\`") || obj.path.getBetweenStrs("\'", "\'") || obj.path.getBetweenStrs("\"", "\"")
                        obj.path = pathRoute + obj.path
                        obj.routeMiddleware = data.split(',')[1]
                        if (obj.routeMiddleware.includes('[')) {
                            // TODO: handle array of middlwares
                        } else {
                            obj.routeMiddleware = obj.routeMiddleware.replaceAll('(', '').replaceAll(')', '').replaceAll(' ', '')
                        }
                        obj.varFileName = data.split(',')[2]
                        obj.varFileName = obj.varFileName.replaceAll('(', '').replaceAll(')', '').replaceAll(' ', '')
                    }

                    // handle middlewares in Routes | TODO: refactor this
                    if (obj.routeMiddleware) {
                        let func = obj.routeMiddleware
                        var refFuncao = null
                        var varFileName = null
                        if (func.split(".").length > 1) {// Identifying subfunction reference
                            refFuncao = func.split(".")[1].trim()
                            varFileName = func.split(".")[0].trim()
                        } else {
                            varFileName = func.split(".")[0].trim()
                        }

                        var idx = importedFiles.findIndex(e => e.varFileName && varFileName && (e.varFileName == varFileName))
                        var exportPath = null
                        if (idx == -1) {
                            importedFiles.forEach(imp => {
                                if (exportPath)
                                    return
                                let found = imp && imp.exports ? imp.exports.find(e => e.varName && varFileName && (e.varName == varFileName)) : null
                                if (found) {
                                    if (!refFuncao)
                                        refFuncao = found.varName
                                    if (imp.isDirectory)
                                        exportPath = found.path
                                    else
                                        exportPath = imp.fileName      // TODO: change variable name
                                }
                            })
                        }

                        // Referenced in another file
                        if (idx > -1 || exportPath) {
                            // Bringing reference
                            var pathFile = null
                            if (exportPath)
                                pathFile = exportPath
                            else
                                pathFile = importedFiles[idx].fileName
                            var extension = await getExtension(pathFile)
                            obj.routeMiddleware = await functionRecognizerInFile(pathFile + extension, refFuncao)
                        } else {
                            // Referenced in the same file
                            obj.routeMiddleware = await handleData.functionRecognizerInData(aDataRaw, varFileName)
                        }
                    }
                    // end handle middlewares

                    var idx = importedFiles.findIndex(e => e.varFileName && obj.varFileName && (e.varFileName == obj.varFileName))
                    var exportPath = null
                    if (idx == -1) {
                        importedFiles.forEach(imp => {
                            if (exportPath)
                                return
                            let found = imp && imp.exports ? imp.exports.find(e => e.varName && obj.varFileName && (e.varName == obj.varFileName)) : null
                            if (found) {
                                if (imp.isDirectory)
                                    exportPath = found.path
                                else
                                    exportPath = imp.fileName      // TODO: change variable name
                            }
                        })
                    }

                    if (idx > -1 || exportPath) {
                        var pathFile = null
                        if (exportPath)
                            pathFile = exportPath
                        else
                            pathFile = importedFiles[idx].fileName

                        obj.fileName = pathFile
                        var auxRelativePath = obj.fileName.split('/')
                        auxRelativePath.pop()
                        auxRelativePath = auxRelativePath.join('/')
                        var extension = await getExtension(obj.fileName)
                        var auxPaths = await readEndpointFile(obj.fileName + extension, (obj.path || ''), auxRelativePath, obj.routeMiddleware)
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

function getImportedFiles(aDataRaw, relativePath) {
    return new Promise(async (resolve, reject) => {
        var importedFiles = []
        var importeds = aDataRaw.split(new RegExp(`import`, "i"))
        var requireds = aDataRaw.replaceAll('\n', ' ').split(new RegExp(`\\s*\\t*const\\s*\\t*|\\s*\\t*var\\s*\\t*|\\s*\\t*let\\s*\\t*`, "i"))
        requireds = requireds.filter(e => e.split(new RegExp(`=\\s*\\t*\\s*\\t*require\\s*\\t*\\s*\\t*\\(`, "i")).length > 1)

        // Such as: import foo, { Foo } from './foo'
        if (importeds && importeds.length > 1) {
            importeds.shift()
            for (let index = 0; index < importeds.length; ++index) {
                let imp = importeds[index]
                var obj = { varFileName: null, fileName: null, exports: [] }
                var varFileName = imp.split(new RegExp(`from`, "i"))[0].trim()
                if (varFileName.includes('{')) {

                    // TODO: handle alias 'as'

                    if (varFileName.split(new RegExp(",\\s*\\n*\\t*\\s*\\n*\\t*{")).length > 1) {     // such as: import foo, { Foo } from './foo'
                        obj.varFileName = varFileName.split('{')[0].replaceAll(',', '').trim()
                    }
                    varFileName = varFileName.replaceAll('\n', '')
                    varFileName.split('{')[1].split(',').forEach(exp => {
                        exp = exp.replaceAll('{', '').replaceAll('}', '').replaceAll(',', '').trim()
                        if (exp == '')
                            return
                        obj.exports.push({ varName: exp, path: null })
                    })
                } else {
                    obj.varFileName = varFileName
                }

                var fileName = imp.split(new RegExp(";|\n"))[0].trim()
                if (fileName && fileName.split(new RegExp(` from `, "i")).length > 1) {     // TODO: verify case: " ... }from ... "
                    fileName = fileName.split(new RegExp(` from `, "i"))[1].trim()
                } else if (imp.split(new RegExp(` from `, "i")).length > 1) {
                    fileName = imp.split(new RegExp(` from `, "i"))[1].trim()
                }

                fileName = fileName.replaceAll('\'', '').replaceAll('\"', '').replaceAll('\`', '').replaceAll(' ', '').replaceAll(';', '').replaceAll('\n', '')
                // Captures only local files
                if (fileName.includes("./")) {
                    var pathFile = null
                    if (relativePath) { // TODO: pass to function
                        if (fileName.includes("../")) {
                            var foldersToBack = fileName.split("../").length - 1
                            var RelativePathBacked = relativePath.split('/')
                            RelativePathBacked = RelativePathBacked.slice(0, (-1) * foldersToBack)
                            RelativePathBacked = RelativePathBacked.join('/')

                            pathFile = RelativePathBacked + '/' + fileName.replaceAll('../', '')//.replaceAll('//', '/')
                        } else {
                            pathFile = relativePath + fileName.replaceAll('./', '/')
                        }
                    } else {
                        pathFile = fileName
                    }

                    obj.fileName = pathFile
                    obj.isDirectory = fs.existsSync(pathFile) && fs.lstatSync(pathFile).isDirectory() ? true : false

                    // Checking if reference is to file
                    if (obj.isDirectory && obj.exports.length > 0) {

                        let indexExtension = await getExtension(pathFile + '/index')

                        if (indexExtension != '') {    // index exist
                            let dataFile = await getFileContent(pathFile + '/index' + indexExtension)
                            if (dataFile) {

                                let imports = await getImportedFiles(dataFile, obj.fileName)
                                for (let idx = 0; idx < obj.exports.length; ++idx) {
                                    var varName = obj.exports[idx].varName
                                    var idxFound = imports.findIndex(e => e.varFileName && varName && (e.varFileName.toLowerCase() == varName.toLowerCase()))
                                    var exportPath = null
                                    if (idxFound == -1) {
                                        imports.forEach(imp => {
                                            if (exportPath)
                                                return
                                            let found = imp && imp.exports ? imp.exports.find(e => e.varName && varName && (e.varName.toLowerCase() == varName.toLowerCase())) : null
                                            if (found) {
                                                if (imp.isDirectory)
                                                    exportPath = null
                                                else
                                                    exportPath = imp.fileName      // TODO: change variable name
                                            }
                                        })

                                        if (exportPath) {
                                            let extension = await getExtension(exportPath)
                                            obj.exports[idx].path = exportPath + extension
                                        }
                                    }

                                    if (idxFound > -1) {
                                        const pathFile = imports[idxFound].fileName
                                        let extension = await getExtension(pathFile)
                                        obj.exports[idx].path = pathFile + extension
                                    }
                                }
                            }
                        }
                    } else {
                        // TODO: reference in the file
                    }
                    importedFiles.push(obj)
                }
            }
        }

        // Such as: const foo = required('./foo')
        if (requireds && requireds.length > 0) {
            requireds.forEach(req => {
                var obj = { varFileName: null, fileName: null, exports: [] }
                var varFileName = req.split(new RegExp(`=\\s*\\t*\\s*\\t*require\\s*\\t*\\s*\\t*\\(`, "i"))[0].trim()

                if (varFileName.includes('{')) {

                    // TODO: handle alias 'as'

                    if (varFileName.split(new RegExp(",\\s*\\t*\\s*\\t*{")).length > 1) {     // such as: import foo, { Foo } from './foo'
                        obj.varFileName = varFileName.split('{')[0].replaceAll(',', '').trim()
                    }
                    varFileName = varFileName.replaceAll('\n', '')
                    varFileName.split('{')[1].split(',').forEach(exp => {
                        exp = exp.replaceAll('{', '').replaceAll('}', '').replaceAll(',', '').trim()
                        if (exp == '')
                            return
                        obj.exports.push({ varName: exp, path: null })
                    })
                } else {
                    obj.varFileName = varFileName
                }

                var fileName = req.split(new RegExp(`=\\s*\\t*\\s*\\t*require\\s*\\t*\\s*\\t*\\(`, "i"))[1].trim()
                fileName = fileName.split(")")[0]
                fileName = fileName.replaceAll('\'', '').replaceAll('\"', '').replaceAll('\`', '').replaceAll(' ', '')

                // Captures only local files
                if (fileName.includes("./")) {
                    if (fileName.split(new RegExp(`.json`, "i")).length == 1) { // Will not recognize files with .json extension
                        var pathFile = null
                        if (relativePath) { // TODO: pass to function
                            if (fileName.includes("../")) {
                                var foldersToBack = fileName.split("../").length - 1
                                var RelativePathBacked = relativePath.split('/')
                                RelativePathBacked = RelativePathBacked.slice(0, (-1) * foldersToBack)
                                RelativePathBacked = RelativePathBacked.join('/')

                                pathFile = RelativePathBacked + '/' + fileName.replaceAll('../', '')
                            } else {
                                pathFile = relativePath + fileName.replaceAll('./', '/')
                            }
                        } else {
                            pathFile = fileName
                        }

                        obj.fileName = pathFile
                        obj.isDirectory = fs.existsSync(pathFile) && fs.lstatSync(pathFile).isDirectory() ? true : false

                        importedFiles.push(obj)
                    }
                }
            })
        }
        return resolve(importedFiles)
    })
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
                if (cleanedData.split(new RegExp("export\\s*\\t*\\s*\\t*default\\s*\\t*\\s*\\t*\\=*\\s*\\t*\\s*\\t*\\(.+\\).+\\{")).length > 1) {
                    let directPattern = cleanedData.split(new RegExp("export\\s*\\t*\\s*\\t*default\\s*\\t*\\s*\\t*\\=*\\s*\\t*\\s*\\t*\\(.+\\).+\\{"))
                    if (directPattern.length > 1)
                        directPattern = true
                    else
                        directPattern = false

                    if (directPattern) { // Direct declaration in module.exports
                        var funcStr = await handleData.functionRecognizerInData(cleanedData, `export\\s*default`)
                        return resolve(funcStr)
                    } else { // Indirect declaration in module.exports
                        var funcName = cleanedData.split(new RegExp("export\\s*\\n*\\t*\\s*\\n*\\t*default\\s*\\n*\\t*\\s*\\n*\\t*"))
                        if (funcName[1])
                            funcName = funcName[1].split(/\n|\s|\t|\;|\{|\}|\(|\)|\[|\]/)
                        else
                            return resolve(null)    // TODO: Verify 'null' case 
                        var funcStr = await handleData.functionRecognizerInData(cleanedData, funcName[0])
                        return resolve(funcStr)
                    }
                } else {
                    let directPattern = cleanedData.split(new RegExp(`module\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*exports\\s*\\n*\\t*\\s*\\n*\\t*\\=*\\s*\\n*\\t*\\s*\\n*\\t*\\(.+\\).+\\{`))
                    if (directPattern.length > 1)
                        directPattern = true
                    else
                        directPattern = false

                    if (directPattern) { // Direct declaration in module.exports
                        var funcStr = await handleData.functionRecognizerInData(cleanedData, `module\\.exports`)
                        return resolve(funcStr)
                    } else { // Indirect declaration in module.exports
                        var funcName = cleanedData.split(new RegExp("module\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*exports\\s*\\n*\\t*\\s*\\n*\\t*\\=\\s*\\n*\\t*\\s*\\n*\\t*"))
                        if (funcName[1])
                            funcName = funcName[1].split(/\n|\s|\t|\;|\{|\}|\(|\)|\[|\]/)
                        else
                            return resolve(null)    // TODO: Verify 'null' case 
                        var funcStr = await handleData.functionRecognizerInData(cleanedData, funcName[0])
                        return resolve(funcStr)
                    }
                }

            }
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

function getFileContent(pathFile) {
    return new Promise((resolve) => {
        fs.readFile(pathFile, 'utf8', function (err, data) {
            if (err)
                return resolve(null)
            return resolve(data)
        })
    })
}


module.exports = {
    readEndpointFile,
    getExtension
}