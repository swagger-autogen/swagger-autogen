const fs = require('fs')
const JSON5 = require('json5')
const merge = require('deepmerge')
const swaggerTags = require('./swagger-tags')
const handleData = require('./handle-data')
const statics = require('./statics')

const overwriteMerge = (destinationArray, sourceArray, options) => sourceArray

/**
 * TODO: fill
 * @param {*} filePath 
 * @param {*} pathRoute 
 * @param {*} relativePath 
 * @param {*} receivedRouteMiddlewares 
 */
function readEndpointFile(filePath, pathRoute = '', relativePath, receivedRouteMiddlewares = [], restrictedContent) {
    return new Promise((resolve, reject) => {
        let paths = {}
        fs.readFile(filePath, 'utf8', async function (err, data) {
            if (err || data.trim() === '')
                return resolve(false)

            // TODO: refactor this. Loop to build string?
            let regex = "\\s*\\n*\\t*\\.\\s*\\n*\\t*route\\s*\\n*\\t*\\(|" +
                "\\s*\\n*\\t*\\.\\s*\\n*\\t*use\\s*\\n*\\t*\\(|" +
                "\\s*\\n*\\t*\\.\\s*\\n*\\t*get\\s*\\n*\\t*\\(|" +
                "\\s*\\n*\\t*\\.\\s*\\n*\\t*head\\s*\\n*\\t*\\(|" +
                "\\s*\\n*\\t*\\.\\s*\\n*\\t*post\\s*\\n*\\t*\\(|" +
                "\\s*\\n*\\t*\\.\\s*\\n*\\t*put\\s*\\n*\\t*\\(|" +
                "\\s*\\n*\\t*\\.\\s*\\n*\\t*delete\\s*\\n*\\t*\\(|" +
                "\\s*\\n*\\t*\\.\\s*\\n*\\t*patch\\s*\\n*\\t*\\(|" +
                "\\s*\\n*\\t*\\.\\s*\\n*\\t*options\\s*\\n*\\t*\\("

            let dataToGetPatterns = data    // Remove string, comments and inside parentheses
            dataToGetPatterns = await handleData.removeComments(dataToGetPatterns, false)
            dataToGetPatterns = await handleData.removeStrings(dataToGetPatterns)
            dataToGetPatterns = await handleData.removeInsideParentheses(dataToGetPatterns, true)

            /**
             * Bug fix when HTTP methods are in the end of 'dataToGetPatterns'
             * Issue: #49
             */
            if (dataToGetPatterns) {
                let lastElem = dataToGetPatterns.split('.').slice(-1)[0].replaceAll(' ', '')
                if (statics.METHODS.includes(lastElem)) {
                    dataToGetPatterns = dataToGetPatterns + "("
                }
            }

            let firstPattern = null
            var patternsServer = []         // Stores patterns, such as: route, app, etc...
            let propRoutes = []             // Used to store the new Router() properties, such as 'prefix'
            let regexRouteMiddlewares = ''
            let dataSrc = null

            /**
             * CASE: 
             * import UserRouters from "./user";
             * ...
             * router.use("/", new UserRouters().routes);
             */
            if (restrictedContent)
                dataSrc = restrictedContent
            else
                dataSrc = data

            let aData = await handleData.removeComments(dataSrc, true)
            aData = await handleData.clearData(aData)
            let converted = await handleData.dataConverter(aData)
            aData = converted.data
            patternsServer = converted.patterns

            /**
             * Eliminating unwanted patterns within endpoints
             * Avoinding cases, such as: route.get('/path', ... ...query().delete().where(...); whithin of the endpoint's functions make problems because of the '.delete()'
             */
            let aDataAux = aData
            let finished = false
            let aDataToClean = new Set()
            let count = 0
            while (!finished && count < 300) {
                count += 1  //To avoid infinite loop
                let dat = await handleData.stack0SymbolRecognizer(aDataAux, '(', ')')
                if (dat == null) {
                    finished = true
                    continue
                }

                aDataToClean.add(dat)
                dat = '(' + dat + ')'
                aDataAux = aDataAux.replace(dat, ' ')
            }


            aDataToClean = [...aDataToClean]    // converting to array
            for (let idxData = 0; idxData < aDataToClean.length; ++idxData) {
                let data = aDataToClean[idxData]
                let swaggerComments = await handleData.getSwaggerComments(data)
                data = await handleData.removeComments(data)

                // Avoiding ploblems when functions has the same name of a .methods 
                for (let idxMet = 0; idxMet < statics.METHODS.length; ++idxMet) {
                    let method = statics.METHODS[idxMet]
                    data = data.split(new RegExp('\\.\\s*\\n*\\t*' + method))
                    data = data.join('.{_{__function__}_}' + method)
                }
                data = '(' + data + (swaggerComments !== '' ? '\n' + swaggerComments : '') + ')'
                aData = aData.replaceAll('(' + aDataToClean[idxData] + ')', data)
            }

            // CASE: const router = new Router({ prefix: '/api/v1' });
            const regexNewRouter = /(\w*\s*\n*\t*\=\s*\n*\t*new\s*\n*\t*Router\s*\n*\t*\(\s*\n*\t*{)/
            if (regexNewRouter.test(aData)) {
                const routes = aData.split(regexNewRouter)
                for (let index = 1; index < routes.length; index += 2) {
                    let route = routes[index]
                    let prop = routes[index + 1]
                    let routerObj = { routeName: null }

                    if (route.includes("Router") && prop.includes("prefix")) {
                        routerObj.routeName = route.split(new RegExp("\\=|\\s|\\n|\\t"))[0].replaceAll(' ', '')
                        let prefix = prop
                        prefix = prefix.split(/\}\s*\n*\t*\)/)[0]
                        if (prefix && prefix.split(new RegExp("\\s*prefix\\s*\\n*\\t*\\:").length > 1)) {
                            prefix = prefix.split(new RegExp("\\s*prefix\\s*\\n*\\t*\\:\\s*\\n*\\t*"))[1].trimLeft()
                            prefix = prefix.split(new RegExp("\\s|\\n|\\t|\\,"))[0].trim()
                            prefix = prefix.replaceAll('\'', '').replaceAll('\"', '').replaceAll('\`', '')
                        }
                        routerObj.prefix = prefix
                        propRoutes.push(routerObj)
                    }
                }
            }

            if (aData.includes(statics.SWAGGER_TAG + '.patterns')) {
                /**
                 * Manual pattern recognition
                 */

                let patterns = new Set()
                patternsServer.forEach(p => patterns.add(p))

                try {
                    patterns = eval(aData.replaceAll(' ', '').split(statics.SWAGGER_TAG + '.patterns=')[1].split('*/')[0])
                } catch (err) {
                    console.error('Syntax error: ' + statics.SWAGGER_TAG + '.patterns' + aData.split(statics.SWAGGER_TAG + '.patterns')[1].split('*/')[0])
                    console.error(err)
                    return resolve(false)
                }

                if (patterns.size > 0)
                    patterns.add("____CHAINED____") // TO CASE: router.get(...).post(...).put(...)...

                regex = ''
                patterns.forEach(pattern => {
                    if (pattern && pattern.split(new RegExp("\\!|\\=|\\<|\\>|\\,|\\;|\\:|\\{|\\}|\\(|\\)|\\[|\\]|axios|superagent|request|fetch|supertest", "i")).length > 1)
                        return

                    if (!firstPattern)
                        firstPattern = pattern
                    // TODO: refactor this. Loop to build string?
                    regex += `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*get\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*head\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*post\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*put\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*delete\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*patch\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*options\\s*\\n*\\t*\\(|`

                    regexRouteMiddlewares += `\\/?\\s*\\n*\\t*${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*use\\s*\\n*\\t*\\(|`
                })
                regex = regex.slice(0, -1)
                regexRouteMiddlewares = regexRouteMiddlewares.slice(0, -1)
                patternsServer = [...patterns]
            } else {
                /** 
                 * Automatic pattern recognition
                 */

                let serverVars = []
                let patterns = new Set()
                patternsServer.forEach(p => patterns.add(p))

                serverVars = dataToGetPatterns.split(new RegExp(regex))
                if (serverVars && serverVars.length > 1)
                    serverVars.forEach(pattern => {
                        let auxPattern = (pattern.split(new RegExp(regex))[0].split(/\n|\s|\t|';'|\{|\}|\(|\)|\[|\]/).splice(-1)[0])  // ex.: app, route, server, etc.      
                        if (auxPattern && auxPattern != '')
                            patterns.add(auxPattern)
                    })

                if (patterns.size > 0)
                    patterns.add("____CHAINED____") // TO CASE: router.get(...).post(...).put(...)...

                regex = ''
                patterns.forEach(pattern => {
                    if (pattern.split(new RegExp("\\!|\\=|\\<|\\>|\\,|\\;|\\:|\\{|\\}|\\(|\\)|\\[|\\]|axios|superagent|request|fetch|supertest", "i")).length > 1)
                        return
                    if (!firstPattern)
                        firstPattern = pattern
                    // TODO: refactor this. Loop to build string?
                    regex += `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*get\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*head\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*post\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*put\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*delete\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*patch\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*options\\s*\\n*\\t*\\(|` +
                        `(\\s|\\n|\\t|;|\\*\\/)${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*route\\s*\\n*\\t*\\(|`

                    regexRouteMiddlewares += `(\\/?\\s*\\n*\\t*${pattern}\\s*\\n*\\t*\\.\\s*\\n*\\t*use\\s*\\n*\\t*\\(\\s*\\n*\\t*)|`
                })
                regex = regex.slice(0, -1)

                regexRouteMiddlewares = regexRouteMiddlewares.slice(0, -1)
                patternsServer = [...patterns]
            }

            let aForcedsEndpoints = swaggerTags.getForcedEndpoints(aData)
            aForcedsEndpoints = aForcedsEndpoints.map(forced => {
                return forced += "\n" + statics.STRING_BREAKER + "FORCED" + statics.STRING_BREAKER + "\n"
            })

            // routeMiddlewares: Middlewares to aply in the endpoint and pass to the next route
            var routeMiddlewares = [...receivedRouteMiddlewares.map(r => { r.path = false; r.fixedRoute = true; r.position = -1; return r })]     // This will cause the middleware to be passed on to all sub-routes

            /**
             * CASE: router.use(middleware).get(...).post(...).put(...)...
             * TODO: refactor this: pass to function
             */
            var rawRouteMiddlewares = aData.split(new RegExp(regexRouteMiddlewares))
            rawRouteMiddlewares.shift()
            var localRouteMiddlewares = []  // localRouteMiddlewares: Used to store and to apply middleware's route in the local endpoints

            aData = await handleData.addReferenceToMethods(aData, patternsServer)

            /**
             * CASE: 
             * router.all('/...', ...)
             */
            aData = aData.split(new RegExp("\\.\\s*all\\s*\\(\\[\\_\\[all\\]\\_\\]\\)\\(\\[\\_\\[",))
            aData = aData.join('.use([_[use]_])([_[')
            /* END CASE */

            const aDataRaw = aData

            /**
             * Getting the reference of all files brought with 'import' and 'require'
             */
            var importedFiles = null
            if (restrictedContent) {
                restrictedContent = await handleData.removeComments(restrictedContent)
                importedFiles = await getImportedFiles(data, relativePath)
            } else {
                importedFiles = await getImportedFiles(aDataRaw, relativePath)
            }

            if (regex != '') {          // Some method was found like: .get, .post, etc.
                aData = [...aData.split(new RegExp(regex)), ...aForcedsEndpoints]
                aData[0] = undefined    // Delete 'header' in file
                aData = aData.filter(data => {
                    if (data && data.replaceAll('\n', '').replaceAll(' ', '').replaceAll('\t', '') != '')
                        return true

                    return false
                })

                var aDataRawCleaned = await handleData.removeComments(aDataRaw, true)

                aDataRawCleaned = aDataRawCleaned.replaceAll('\n', ' ')
                var aRoutes = aDataRawCleaned.split(new RegExp(`\\s*\\t*\\w\\s*\\t*\\.\\s*\\t*use\\s*\\t*\\(`))
                if (aRoutes.length > 1)
                    aRoutes.shift()

                aData = [...aRoutes, ...aData]

                var routePrefix = ''        // prefix of new Router()
                var lastValidPattern = ''
                /**
                 * All endpoints will be processed here
                 */
                for (let idxElem = 0; idxElem < aData.length; idxElem++) {
                    var elem = aData[idxElem]
                    if (!elem || elem.slice(0, 3) !== "[_[")
                        continue

                    let endpointFunctions = []
                    let verifyPath = elem.split(',')
                    if (!verifyPath[0].includes('[_[use]_])([_[') && (verifyPath.length == 1 || (!verifyPath[0].includes('\"') && !verifyPath[0].includes('\'') && !verifyPath[0].includes('\`'))))
                        continue

                    let endpointSwaggers = null
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
                    let predefPattern = false
                    let isChained = false
                    let position = null

                    if (elem && elem.includes('[_[') && elem.includes(']_]')) {
                        elem = elem.split(new RegExp("\\[_\\[|\\]_\\]\\)\\("))
                        predefMethod = elem[1]
                        predefPattern = elem[3]
                        position = parseInt(elem[5])

                        if (predefPattern === "____CHAINED____") {// TO CASE: router.get(...).post(...).put(...)...
                            predefPattern = lastValidPattern
                            isChained = true
                        } else
                            lastValidPattern = predefPattern

                        // CASE: router.use(middleware).get(...).post(...).put(...)...
                        if (elem[6] && elem[6].includes("____CHAINED____")) {
                            let midd = elem[6].split("____CHAINED____")[0]
                            localRouteMiddlewares.push({ middleware: midd, rawRoute: aData[idxElem].split(midd)[1] })
                            continue
                        }

                        let prefixFound = propRoutes.find(r => r.routeName === predefPattern)
                        if (prefixFound)
                            routePrefix = prefixFound.prefix || ''
                        else
                            routePrefix = ''

                        if (elem.length < 5) {
                            // Forced Endpoint
                            let found = elem.find(e => e.includes("/_undefined_path_0x"))
                            if (found) {
                                elem = found
                                endpointFunctions.push({ metadata: null, callbackParameters: null, func: found })
                            } else
                                continue
                        } else
                            elem = elem[6]

                        predefPath = swaggerTags.getPath(elem, autoMode)
                        elem = elem.trim()

                        // Identifying which symbol the path stars and ends ( \", \' or \` )
                        const quotMark = elem[0]
                        if ((quotMark == '\"' || quotMark == '\'' || quotMark == '\`') && !elem.includes("#swagger.path") && elem.split(quotMark).length > 2) {
                            let elemAux = elem.replaceAll(`\\${quotMark}`, statics.STRING_BREAKER + "quotMark" + statics.STRING_BREAKER)
                            elemAux = elemAux.split(quotMark)
                            rawPath = elemAux[1]
                            rawPath = rawPath.replaceAll(statics.STRING_BREAKER + "quotMark" + statics.STRING_BREAKER, `\\${quotMark}`)
                        }

                        if (elem.includes("#swagger.path")) {
                            rawPath = swaggerTags.getPath(elem, autoMode)
                        }
                    }

                    elem = await handleData.stackSymbolRecognizer(elem, '(', ')')

                    /**
                     * CASE (continuing): router.use(middleware).get(...).post(...).put(...)... 
                     * Adding middleware to be processed together with the other endpoint functions 
                     */
                    if (isChained) {
                        const endpointRegex = `\\(\\[\\_\\[${predefMethod}\\]\\_\\]\\)\\(\\[\\_\\[____CHAINED____\\]\\_\\]\\)\\(\\[\\_\\[${position}\\]\\_\\]\\)\\(\\s*\\n*\\t*.${rawPath}.\\s*\\n*\\t*\\,`
                        const found = localRouteMiddlewares.find(midd => midd.rawRoute && midd.rawRoute.split(new RegExp(endpointRegex)).length > 1)
                        if (found)
                            elem += ',' + found.middleware
                    }

                    if (elem.includes(statics.STRING_BREAKER + "FORCED" + statics.STRING_BREAKER))
                        forced = true

                    if (swaggerTags.getIgnoreTag(elem))
                        continue

                    autoMode = swaggerTags.getAutoTag(elem)
                    const elemOrig = elem

                    /**
                     * Handling passed functions in the endpoint parameter, such as: app.get("/path", ...)
                     */
                    var elemParam = await handleData.removeStrings(elem)
                    elemParam = await handleData.removeComments(elemParam)
                    if ((elemParam && elemParam.split(",").length > 1 && !forced) || predefMethod === 'use') {
                        var functions = []      // Array that contains possible functions in other files
                        var auxElem = await handleData.removeComments(elem)
                        auxElem = auxElem.replace(rawPath, "")
                        let functionsInParameters = auxElem
                        if (functionsInParameters.slice(-1)[0] == ')') // if the last elem is ')'
                            functionsInParameters = functionsInParameters.slice(0, -1)
                        functionsInParameters = functionsInParameters.split(',')

                        auxElem = auxElem.replaceAll('\n', '').replaceAll(' ', '')
                        if ((auxElem.split(",").length > 1) || predefMethod === 'use') { // 
                            /**
                             * Handling foo.method('/path', ..., ...)'
                             * Getting function not referenced ( such as: (req, res) => { ... } )
                             */

                            let functionArray = elemOrig.replace(rawPath, "").split(',')

                            elem = rawPath
                            if (functionArray.length > 1 && rawPath)
                                functionArray.shift()
                            functionArray = functionArray.join(',')

                            functionArray = functionArray.split(new RegExp("^\\s*function\\s*\\("))
                            functionArray = functionArray.join('(')
                            functionArray = functionArray.split(new RegExp("\\,\\s*function\\s*\\("))
                            functionArray = functionArray.join('( (')

                            functionArray = functionArray.replaceAll('{_{__function__}_}', '')
                            for (let idxFunc = 0; idxFunc < 15; ++idxFunc) {

                                // Adding '(' and ')' to arrow functions that not contains '(' and ')', such as: async req => {
                                if (functionArray && functionArray.split(new RegExp("\\s*\\t*=>\\s*\\n*\\t*").length > 1)) {
                                    let params = functionArray.trim().split(new RegExp("\\s*\\t*=>\\s*\\n*\\t*"))
                                    if (params && params.length > 1 && params[0].trim().slice(-1)[0] !== ')') {
                                        let paramsAux = params[0].split(new RegExp("\\s+|\\n+|\\t+|\\,|\\.|\\;|\\:"))
                                        paramsAux = paramsAux.slice(-1)[0]
                                        if (paramsAux.split(/\*|\\|\/|\(|\)|\{|\}|\[|\]/).length === 1 && paramsAux !== '')
                                            functionArray = functionArray.replace(new RegExp(`${paramsAux}\\s*\\t*=>\\s*\\n*\\t*`), `(${paramsAux}) => `)
                                    }
                                }

                                let funcNotReferenced = await handleData.popFunction(functionArray)
                                if (predefMethod == 'use' && funcNotReferenced) {
                                    if (funcNotReferenced.split(')')[0].split(',').length > 2) {
                                        let isLocalRouteMiddleware = false
                                        if (aData[idxElem].split(new RegExp(regex)).length > 1)  // Verify if is not a local route middleware, such as: route.use(middleware).get(...).post(...)...
                                            isLocalRouteMiddleware = true
                                        routeMiddlewares.push({ metadata: null, callbackParameters: null, func: funcNotReferenced, middleware: true, path: rawPath, isLocalRouteMiddleware, position })
                                        functionArray = functionArray.replace(funcNotReferenced, ' ')
                                    }
                                } else if (funcNotReferenced) {

                                    /**
                                     * CASE:
                                     * app.method("/foo", (req, res) => {
                                     *    foo(req, res);
                                     * });
                                     */
                                    if (funcNotReferenced.trim()[0] == '(') { // there are parameters
                                        let funcNotRefFormated = funcNotReferenced.replaceAll('(', '( ').replaceAll(')', ' )')
                                        let funcParams = await handleData.stack0SymbolRecognizer(funcNotRefFormated, '(', ')')
                                        let regexParams = ''

                                        if (funcParams) {
                                            funcParams = funcParams.split(new RegExp("\\:\\s*\\n*\\t*Request\\s*\\n*\\t*|\\:\\s*\\n*\\t*Response\\s*\\n*\\t*|\\:\\s*\\n*\\t*Next\\s*\\n*\\t*|\\:\\s*\\n*\\t*any\\s*\\n*\\t*", "i"))
                                            let tsFunction = false
                                            if (funcParams.length > 1)
                                                tsFunction = true

                                            funcParams = funcParams.join('').replaceAll('\n', '').replaceAll(' ', '').split(',')
                                            let numParams = funcParams.length

                                            for (let idx = 0; idx < numParams; ++idx) {
                                                regexParams += `\\([\\w|\\s]*\\,?[\\w|\\s]*\\,?[\\w|\\s]*[\\s|\\,]+${funcParams[idx]}[\\s|\\,]+[\\w|\\s]*\\,?[\\w|\\s]*\\,?[\\w|\\s]*\\)|`
                                            }
                                            regexParams = regexParams.slice(0, -1)
                                            var refFunc = funcNotRefFormated.split(new RegExp(regexParams))

                                            if (refFunc.length > 1) {
                                                if (tsFunction)
                                                    refFunc = refFunc.slice(0, -1)
                                                else
                                                    refFunc = refFunc.slice(1, -1)
                                                refFunc.map(f => {
                                                    let func = f.replaceAll('\n', ' ').split(new RegExp("\\s*\\t*\\.\\s*\\t*"))
                                                    func = func.join('.')
                                                    func = func.trim().split(new RegExp("\\s|\\n|\\t|\\;|\\/|\\,"))
                                                    func = func.slice(-1)[0].trim()
                                                    if (!statics.RESERVED_FUNCTIONS.includes(func)) // TODO: improve this?
                                                        functions.push(func)
                                                })
                                            }
                                        }
                                    }
                                    /* END CASE */

                                    if (functionArray && functionArray.split(funcNotReferenced).length > 1) {
                                        functionArray = functionArray.replace(funcNotReferenced, ' ')
                                    } else {
                                        let params = await handleData.stack0SymbolRecognizer(funcNotReferenced, '(', ')')
                                        if (params && functionArray.split('(' + params + ')').length > 1) {
                                            functionArray = functionArray.replace('(' + params + ')', ' ')
                                        } else {
                                            // TODO: verify this case
                                        }
                                    }

                                    if (funcNotReferenced.includes("(") && funcNotReferenced.includes(")")) {
                                        endpointFunctions.push({ metadata: null, callbackParameters: null, func: funcNotReferenced })
                                    }
                                } else
                                    break
                            }

                            // endpointSwaggers: Keep 'global' #swaggers in the endpoints, such as: foo.get('/path', /* #swagger.description = "..." */ functions...)
                            endpointSwaggers = await handleData.getSwaggerComments(functionArray)
                            functionArray = await handleData.removeComments(functionArray)
                            functions = [...functions, ...functionArray.split(',')]
                        }

                        /**
                         * functions: Array that contains possible functions in other files
                         */
                        for (var index = 0; index < functions.length; index++) {
                            let func = functions[index]
                            if (!func)
                                continue

                            let funcTest = func.replaceAll('\n', '').replaceAll('\t', '').replaceAll(' ', '')
                            if (funcTest == '' || funcTest == ')')
                                continue

                            var exportPath = null
                            const rexRequire = /\s*require\s*\n*\t*\(/
                            if (rexRequire.test(func)) {

                                if (func && func.split(new RegExp("\\(\\s*__dirname\\s*\\+\\s*\\\"?\\\'?\\\`?")).length > 1) {
                                    func = func.replaceAll('\'', '\"').replaceAll('\`', '\"')
                                    func = func.split(new RegExp("\\(\\s*__dirname\\s*\\+\\s*\\\""))
                                    func = func.join('(\".')
                                }

                                /**
                                 * CASE: foo.method('/path', require('./pathToFile.js'))
                                 */
                                exportPath = func.split(rexRequire)
                                exportPath = exportPath.slice(-1)[0]
                                exportPath = exportPath.split(')')[0]
                                if (exportPath && exportPath.includes('./')) {
                                    if (exportPath.includes("../")) {
                                        let foldersToBack = exportPath.split("../").length - 1
                                        let RelativePathBacked = relativePath.split('/')
                                        RelativePathBacked = RelativePathBacked.slice(0, (-1) * foldersToBack)
                                        RelativePathBacked = RelativePathBacked.join('/')

                                        exportPath = RelativePathBacked + '/' + exportPath.replaceAll('\'', '').replaceAll('\"', '').replaceAll('\`', '').replaceAll(' ', '').replaceAll('\n', '').replaceAll('../', '')
                                    } else {
                                        exportPath = relativePath + exportPath.replaceAll('\'', '').replaceAll('\"', '').replaceAll('\`', '').replaceAll(' ', '').replaceAll('\n', '').replaceAll('./', '/')
                                    }
                                }
                            } else {

                                var refFuncao = null
                                var varFileName = null
                                var refFuncInParam = null
                                func = func.replaceAll('\n', '').replaceAll('\t', '').replaceAll(' ', '').replaceAll('[', '').replaceAll(']', '')

                                /**
                                 * CASE: awilix-express
                                 * const fooFoo = require('./pathToFoo')
                                 * ...
                                 * router.method('/path', fooFoo('foo') )
                                 */
                                if (func.includes('(') && func.includes(')')) {
                                    let params = await handleData.stack0SymbolRecognizer(func, '(', ')')    // TODO: get array with all strings and try to find with each one
                                    if (params && (params[0] == '\"' || params[0] == '\'' || params[0] == '\`')) {
                                        refFuncInParam = params.replaceAll('\"', '').replaceAll('\'', '').replaceAll('\`', '')
                                    }
                                }
                                /* END CASE */

                                func = func.split(new RegExp("\\(|\\)"))[0]
                                if (func.split(new RegExp("\\(|\\)|\\[|\\]|\\{|\\}|\\!|\\=|\\>|\\<")).length > 1 || func.trim() == '')
                                    continue

                                if (func.split(".").length > 1) {
                                    // Identifying subfunction reference, such as: 'controller.store' in the foo.get('/path', controller.store)
                                    refFuncao = func.split(".")[1].trim()
                                    varFileName = func.split(".")[0].trim()
                                } else {
                                    varFileName = func.split(".")[0].trim()
                                }

                                // First, tries to find in the import/require
                                var idx = importedFiles.findIndex(e => e.varFileName && varFileName && (e.varFileName == varFileName))
                                if (idx == -1) {
                                    // Second, tries to find in the 'exports' of import/require, such as 'foo' in the: import { foo } from './fooFile'
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
                                } else {
                                    if (importedFiles[idx].isDirectory && !importedFiles[idx].isRequireDirLib) {
                                        exportPath = importedFiles[idx].fileName + '/index'
                                    }
                                }
                            }

                            // If found, so is a reference to another file
                            if (idx > -1 || exportPath) {
                                /**
                                 * Bringing reference
                                 */
                                let pathFile = null
                                if (exportPath)
                                    pathFile = exportPath
                                else {
                                    if (importedFiles[idx] && importedFiles[idx].isRequireDirLib && func && func.split(".").length == 3) {
                                        refFuncao = func.split(".")[2].trim()
                                        pathFile = importedFiles[idx].fileName + '/' + func.split(".")[1].trim()
                                    } else {
                                        pathFile = importedFiles[idx].fileName
                                    }
                                }

                                let extension = await getExtension(pathFile)
                                let refFunction = await functionRecognizerInFile(pathFile + extension, refFuncao)

                                // Trying to find the reference in the index file
                                // TODO: implements to 'import' and 'exports.default'
                                if (!refFunction && refFuncao && pathFile && pathFile.split('/').length > 1 && pathFile.split('/').slice(-1)[0] == 'index') {
                                    let dataIndexFile = await getFileContent(pathFile + extension)
                                    if (dataIndexFile) {
                                        pathFile = pathFile.split('/').slice(0, -1).join('/')   // removing '/index'
                                        let importsIndexFile = await getImportedFiles(dataIndexFile, pathFile)
                                        let idx = importsIndexFile.findIndex(e => e.varFileName && refFuncao && (e.varFileName == refFuncao))
                                        pathFile = null
                                        if (idx == -1) {
                                            importsIndexFile.forEach(imp => {
                                                if (pathFile)
                                                    return
                                                let found = imp && imp.exports ? imp.exports.find(e => e.varName && refFuncao && (e.varName == refFuncao)) : null
                                                if (found) {
                                                    if (!refFuncao)
                                                        refFuncao = found.varName
                                                    if (imp.isDirectory)
                                                        pathFile = found.path
                                                    else
                                                        pathFile = imp.fileName      // TODO: change variable name
                                                }
                                            })
                                        } else {
                                            pathFile = importsIndexFile[idx].fileName
                                        }
                                        if (pathFile) {
                                            extension = await getExtension(pathFile)
                                            refFunction = await functionRecognizerInFile(pathFile + extension, refFuncao)
                                        }
                                    }
                                }

                                if (!refFunction && refFuncInParam) {
                                    let fileContent = await getFileContent(pathFile + extension)
                                    if (fileContent && fileContent.includes('awilix-express'))
                                        refFunction = await functionRecognizerInFile(pathFile + extension, refFuncInParam)
                                }

                                /**
                                 * CASE: Reference to files in the index.ts
                                 * Ref.: issue #32
                                 */
                                if (!refFunction) {
                                    if (!refFuncao) {
                                        let dataIndexFile = await getFileContent(pathFile + extension)
                                        if (dataIndexFile) {
                                            pathFile = pathFile.split('/').slice(0, -1).join('/')   // removing '/index'

                                            /**
                                             * 'hidding' imports and catching only exports and
                                             * change exports to imports to catched by the getImportedFiles()
                                             */
                                            dataIndexFile = dataIndexFile.split('import').join('__ignored__')
                                            dataIndexFile = dataIndexFile.split('export').join('import')

                                            let exportsIndexFile = await getImportedFiles(dataIndexFile, pathFile)
                                            let idx = -1

                                            /**
                                             * TODO: searching in the varFileName
                                             * let idx = exportsIndexFile.findIndex(e => e.varFileName && (e.varFileName == refFuncao))
                                             */

                                            pathFile = null
                                            if (idx == -1) {
                                                exportsIndexFile.forEach(imp => {
                                                    if (pathFile)
                                                        return
                                                    let found = imp && imp.exports ? imp.exports.find(e => e.varAlias && (e.varAlias == 'default')) : null
                                                    if (found) {
                                                        pathFile = imp.fileName
                                                        if (!refFuncao)
                                                            refFuncao = found.varName
                                                    }
                                                })
                                            }
                                            if (pathFile) {
                                                extension = await getExtension(pathFile)
                                                refFunction = await functionRecognizerInFile(pathFile + extension, refFuncao)
                                            }
                                        }
                                    } else {
                                        // TODO: When refFuncao is != null
                                    }
                                }
                                /* END CASE */

                                if (!refFunction && !refFuncao) {
                                    refFunction = await functionRecognizerInFile(pathFile + extension, varFileName)
                                }

                                if (predefMethod == 'use' && refFunction) {
                                    if (refFunction.split(')')[0].split(',').length > 2) {
                                        let isLocalRouteMiddleware = false
                                        if (aData[idxElem].split(new RegExp(regex)).length > 1)  // Verify if is not a local route middleware, such as: route.use(middleware).get(...).post(...)...
                                            isLocalRouteMiddleware = true
                                        routeMiddlewares.push({ metadata: func, callbackParameters: null, func: refFunction, middleware: true, path: rawPath, isLocalRouteMiddleware, position })
                                    }
                                } else if (refFunction) {
                                    refFunction = await handleData.clearData(refFunction)
                                    endpointFunctions.push({ metadata: func, callbackParameters: null, func: refFunction })
                                }
                            } else {
                                /**
                                 * Referenced in the same file
                                 */
                                let refFunction = await handleData.functionRecognizerInData(aDataRaw, varFileName)
                                if (predefMethod == 'use' && refFunction) {
                                    if (refFunction.split(')')[0].split(',').length > 2) {
                                        let isLocalRouteMiddleware = false
                                        if (aData[idxElem].split(new RegExp(regex)).length > 1)  // Verify if is not a local route middleware, such as: route.use(middleware).get(...).post(...)...
                                            isLocalRouteMiddleware = true
                                        routeMiddlewares.push({ metadata: func, callbackParameters: null, func: refFunction, middleware: true, path: rawPath, isLocalRouteMiddleware, position })
                                    }
                                } else if (refFunction) {
                                    refFunction = await handleData.clearData(refFunction)
                                    endpointFunctions.push({ metadata: func, callbackParameters: null, func: refFunction })
                                }
                            }
                        }
                    }

                    if (predefMethod == 'use')
                        continue

                    /**
                     * endpointFunctions: receives the endpoint functions, local middleware and received middlewares 
                     */
                    let localPath = swaggerTags.getPath(elemOrig, autoMode)

                    endpointFunctions = [
                        ...routeMiddlewares.filter(r => {
                            if ((r.path === "/*" || r.path === "/"))
                                return true
                            if ((r.path === false && r.position < position) || (localPath && r.path && localPath.split(r.path)[0] === '')) // TODO: verify: r.position < position
                                return true
                            return false
                        }),
                        ...endpointFunctions]

                    // Getting  'request', 'response' and 'next' parameters in the endpointFunctions
                    for (let efIdx = 0; efIdx < endpointFunctions.length; ++efIdx) {
                        let ef = endpointFunctions[efIdx]
                        const callbackParameters = await handleData.getCallbackParameters(',' + ef.func)
                        ef.callbackParameters = callbackParameters
                        endpointFunctions[efIdx] = ef
                    }

                    if (endpointSwaggers && endpointSwaggers !== '')
                        endpointFunctions.push({ metadata: null, callbackParameters: null, func: endpointSwaggers })

                    // Getting Path
                    if (!path) {
                        if (!autoMode || elemOrig.includes("#swagger.path"))
                            path = swaggerTags.getPath(elemOrig, autoMode)
                        else
                            path = pathRoute + routePrefix + swaggerTags.getPath(elemOrig, autoMode)

                        path = path.replaceAll('//', '/').replaceAll('//', '/').replaceAll('//', '/').replaceAll('//', '/')
                        objEndpoint[path] = {}
                    }

                    // Getting Method
                    if (!method) {
                        method = swaggerTags.getMethodTag(elemOrig)
                        if (!method)
                            method = predefMethod

                        // Order
                        objEndpoint[path][method] = {}
                        objEndpoint[path][method].tags = []
                        objEndpoint[path][method].summary = undefined
                        objEndpoint[path][method].description = ''
                        objEndpoint[path][method].operationId = undefined
                        objEndpoint[path][method].consumes = undefined
                        objEndpoint[path][method].produces = undefined
                        objEndpoint[path][method].parameters = []
                        objEndpoint[path][method].responses = {}
                        objEndpoint[path][method].security = undefined

                        if (path.includes('_undefined_path_0x'))    // When the path is not found
                            objEndpoint[path][method].tags.push({ name: 'Endpoints without path or method' })
                    }

                    if ((!path || !method))
                        throw console.error("\nError: 'path' or 'method' not found.")

                    /**
                     * Handling all endpoint functions
                     */
                    if (endpointFunctions && endpointFunctions.length == 0) {
                        paths = merge(paths, objEndpoint, { arrayMerge: overwriteMerge })
                    } else {
                        var objInBody = null
                        for (let _idxEF = 0; _idxEF < endpointFunctions.length; ++_idxEF) {
                            let endpoint = endpointFunctions[_idxEF].func

                            if (swaggerTags.getIgnoreTag(endpoint))
                                continue

                            endpoint = endpoint.replaceAll('\n', ' ').replaceAll('/*', '\n').replaceAll('*/', '\n').replaceAll(statics.SWAGGER_TAG, '\n' + statics.SWAGGER_TAG)

                            req = null
                            res = null
                            next = null

                            // Geting callback parameters: 'request', 'response' and 'next'
                            if (autoMode && !req && !res) {
                                if (forced) {
                                    res = elemOrig.split(/([a-zA-Z]*|[0-9]|\_|\-)*\.status\(/)
                                    if (res[1] && res[1] != '')
                                        res = res[1]
                                    else
                                        res = null
                                } else {
                                    const callbackParameters = endpointFunctions[_idxEF].callbackParameters
                                    if (callbackParameters) {
                                        req = callbackParameters.req
                                        res = callbackParameters.res
                                        next = callbackParameters.next
                                    }
                                }
                            }

                            if (endpoint && endpoint.includes(statics.SWAGGER_TAG + '.auto')) {
                                autoMode = swaggerTags.getAutoTag(endpoint)
                            }
                            if (autoMode && Object.entries(objParameters).length == 0) {  // Checking parameters in the path
                                objParameters = await handleData.getPathParameters(path, objParameters)
                            }
                            if (endpoint && endpoint.includes(statics.SWAGGER_TAG + '.operationId')) {
                                objEndpoint[path][method]['operationId'] = swaggerTags.getOperationId(endpoint)
                            }
                            if (endpoint && endpoint.includes(statics.SWAGGER_TAG + '.summary')) {
                                objEndpoint[path][method]['summary'] = swaggerTags.getSummary(endpoint)
                            }
                            if (endpoint && endpoint.includes(statics.SWAGGER_TAG + '.parameters') && endpoint.includes('[') && endpoint.includes(']')) {
                                objParameters = await swaggerTags.getParametersTag(endpoint, objParameters)
                                if (objParameters === false) {
                                    console.error("[swagger-autogen]: Error when trying to recognize '#swagger.parameters'")
                                }
                            }
                            if (endpoint && endpoint.includes(statics.SWAGGER_TAG + '.produces')) {
                                objEndpoint[path][method].produces = await swaggerTags.getProducesTag(endpoint)
                            }
                            if (endpoint && endpoint.includes(statics.SWAGGER_TAG + '.consumes')) {
                                objEndpoint[path][method].consumes = await swaggerTags.getConsumesTag(endpoint)
                            }
                            if (endpoint && endpoint.includes(statics.SWAGGER_TAG + '.responses')) {
                                objResponses = await swaggerTags.getResponsesTag(endpoint, objResponses)
                            }
                            if (endpoint && endpoint.includes(statics.SWAGGER_TAG + '.description')) {
                                objEndpoint[path][method]['description'] = swaggerTags.getDescription(endpoint)
                            }
                            if (endpoint && endpoint.includes(statics.SWAGGER_TAG + '.tags')) {
                                objEndpoint[path][method]['tags'] = swaggerTags.getTags(endpoint)
                            }
                            if (endpoint && endpoint.includes(statics.SWAGGER_TAG + '.security')) {
                                objEndpoint[path][method]['security'] = await swaggerTags.getSecurityTag(endpoint)
                            }
                            if (endpoint && endpoint.includes(statics.SWAGGER_TAG + '.deprecated')) {
                                objEndpoint[path][method]['deprecated'] = swaggerTags.getDeprecatedTag(endpoint)
                            }

                            if (objResponses === false || objParameters === false || objEndpoint === false)
                                return resolve(false)

                            if (autoMode && ((req && req.length > 0) || (res && res.length > 0))) {
                                endpoint = await handleData.removeStrings(endpoint) // Avoiding .status(...) in string
                                endpoint = endpoint.replaceAll('__¬¬¬__', '"')
                                if (req) {
                                    objParameters = handleData.getQueryAndBody(endpoint, req, objParameters)        // Search for parameters in the query and body 
                                    objParameters = handleData.getQueryIndirectly(endpoint, req, objParameters)     // Search for parameters in the query (indirectly)
                                    if (objParameters['__obj__in__body__']) {
                                        if (!objInBody)
                                            objInBody = objParameters['__obj__in__body__']
                                        else if (objInBody.schema && objInBody.schema.properties && objParameters['__obj__in__body__'].schema && objParameters['__obj__in__body__'].schema.properties)
                                            objInBody.schema.properties = { ...objInBody.schema.properties, ...objParameters['__obj__in__body__'].schema.properties }
                                        delete objParameters['__obj__in__body__']
                                    }
                                }
                                if (res) {
                                    objResponses = handleData.getStatus(endpoint, res, objResponses)               // Search for response status
                                    objEndpoint = handleData.getHeader(endpoint, path, method, res, objEndpoint)   // Search for resonse header
                                }
                            }

                            Object.values(objParameters).forEach(objParam => {
                                if (objEndpoint[path][method].parameters) {
                                    let idxFound = objEndpoint[path][method].parameters.findIndex(e => e.name === objParam.name)
                                    if (idxFound > -1)
                                        objEndpoint[path][method].parameters[idxFound] = objParam
                                    else
                                        objEndpoint[path][method].parameters.push(objParam)
                                }
                            })
                            objEndpoint[path][method].responses = objResponses

                            if (objInBody && _idxEF == endpointFunctions.length - 1) {
                                objInBody.name = 'obj'  // By default, the name of object recognized automatically in the body will be 'obj' if no parameter are found to be concatenate with it.
                                if (objEndpoint[path][method].parameters && objEndpoint[path][method].parameters.length > 0 && objEndpoint[path][method].parameters.find(e => e.in === 'body')) {
                                    let body = objEndpoint[path][method].parameters.find(e => e.in === 'body')
                                    if (body && !body.schema && (!body.type || (body.type && body.type.toLowerCase() == "object"))) {
                                        body.type = 'object'
                                        objEndpoint[path][method].parameters[0] = { ...objInBody, ...body }
                                    }
                                } else {
                                    objEndpoint[path][method].parameters.push(objInBody)
                                }
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
                }
            }

            var allPaths = {}
            if (aRoutes && aRoutes.length >= 1) {
                for (let file = 0; file < aRoutes.length; file++) {
                    var rt = aRoutes[file]
                    if (rt.split(']_])').length < 3)
                        continue

                    let refFunc = null
                    var obj = { path: null, varFileName: null, middleware: null, fileName: null, isDirectory: null }
                    var data = rt.split(']_])(')
                    var routeName = data[1].split('[_[')[1].trim()
                    let postion = parseInt(data[2].split('[_[')[1])

                    data = await handleData.stackSymbolRecognizer(data[3], '(', ')')

                    let routeFound = propRoutes.find(r => r.routeName === routeName)
                    if (routeFound)
                        routePrefix = routeFound.prefix || ''
                    else
                        routePrefix = ''

                    var exportPath = null
                    const rexRequire = /\s*require\s*\n*\t*\(/
                    if (rexRequire.test(data)) {

                        if (data && data.split(new RegExp("\\(\\s*__dirname\\s*\\+\\s*\\\"?\\\'?\\\`?")).length > 1) {
                            data = data.replaceAll('\'', '\"').replaceAll('\`', '\"')
                            data = data.split(new RegExp("\\(\\s*__dirname\\s*\\+\\s*\\\""))
                            data = data.join('(\".')
                        }

                        /**
                         * CASE: foo.use(require('./routes.js'))
                         */
                        exportPath = data.split(rexRequire)
                        exportPath = exportPath.slice(-1)[0]
                        exportPath = exportPath.split(')')[0]
                        if (exportPath && exportPath.includes('./')) {
                            if (exportPath.includes("../")) {
                                let foldersToBack = exportPath.split("../").length - 1
                                let RelativePathBacked = relativePath.split('/')
                                RelativePathBacked = RelativePathBacked.slice(0, (-1) * foldersToBack)
                                RelativePathBacked = RelativePathBacked.join('/')

                                exportPath = RelativePathBacked + '/' + exportPath.replaceAll('\'', '').replaceAll('\"', '').replaceAll('\`', '').replaceAll(' ', '').replaceAll('\n', '').replaceAll('../', '')
                            } else {
                                exportPath = relativePath + exportPath.replaceAll('\'', '').replaceAll('\"', '').replaceAll('\`', '').replaceAll(' ', '').replaceAll('\n', '').replaceAll('./', '/')
                            }
                            obj.hasRequire = true
                            const isDirectory = fs.existsSync(exportPath) && fs.lstatSync(exportPath).isDirectory() ? true : false
                            if (isDirectory) {
                                obj.isDirectory = true
                                // TODO: Verify other cases
                                exportPath = exportPath + '/index'
                            }
                        }
                    }

                    if (data.split(',').length == 1) { // route with 1 parameter, such as: route.use(middleware)
                        if (data && rt && rt.split(data)[0] && rt.split(data)[0].split(new RegExp(regex)).length > 1)
                            continue

                        obj.path = ''
                        obj.varFileName = data
                        obj.varFileName = obj.varFileName.replaceAll('(', '').replaceAll(')', '').replaceAll(' ', '')
                        if (obj.hasRequire && routePrefix)  // TODO: Verify other cases
                            obj.path = ''
                        else
                            obj.path = pathRoute + routePrefix + obj.path
                        obj.path = obj.path.replaceAll('////', '/').replaceAll('///', '/').replaceAll('//', '/')
                    } else {
                        obj.path = data.split(',')[0]
                        obj.path = obj.path.getBetweenStrs("\`", "\`") || obj.path.getBetweenStrs("\'", "\'") || obj.path.getBetweenStrs("\"", "\"")

                        if (obj.hasRequire && routePrefix)  // TODO: Verify other cases
                            obj.path = ''
                        else
                            obj.path = pathRoute + routePrefix + obj.path

                        obj.path = obj.path.replaceAll('////', '/').replaceAll('///', '/').replaceAll('//', '/')
                        obj.varFileName = data.split(',').slice(-1)[0]

                        /**
                         * CASE: 
                         * import fooFoo from "./pathToFoo";
                         * ...
                         * router.use("/", new fooFoo().foo);
                         */
                        if (obj.varFileName.split(new RegExp("new\\s+")).length > 1) {
                            if (obj.varFileName.slice(-1)[0] == ')')
                                obj.varFileName = obj.varFileName.slice(0, -1)
                            obj.varFileName = obj.varFileName.split(new RegExp("\\s*new\\s+"))[1]
                            if (obj.varFileName.split(new RegExp("\\([\\s|\\S]*\\)")).length > 1) {
                                obj.varFileName = obj.varFileName.split(new RegExp("\\([\\s|\\S]*\\)"))
                                obj.varFileName = obj.varFileName.join('')
                            }
                            if (obj.varFileName.includes('.')) {
                                refFunc = obj.varFileName.split('.')[1]
                                obj.varFileName = obj.varFileName.split('.')[0]
                            }
                        }
                        /* END CASE */

                        obj.varFileName = obj.varFileName.replaceAll('(', '').replaceAll(')', '').replaceAll(' ', '')
                        if (refFunc)
                            refFunc = refFunc.replaceAll('(', '').replaceAll(')', '').replaceAll(' ', '')
                    }

                    if (obj.varFileName && obj.varFileName.split(new RegExp("\\:|\\;|\\=|\\>|\\<|\\{|\\}|\\(|\\)|\\[|\\]|\\,")).length > 1)
                        obj.varFileName = null

                    if (refFunc && refFunc.split(new RegExp("\\:|\\;|\\=|\\>|\\<|\\{|\\}|\\(|\\)|\\[|\\]|\\,")).length > 1)
                        refFunc = null

                    if (exportPath)
                        obj.varFileName = exportPath

                    // First, tries to find in the import/require
                    var idx = importedFiles.findIndex(e => e.varFileName && obj.varFileName && (e.varFileName == obj.varFileName))

                    if (idx == -1 && !exportPath) {
                        // Second, tries to find in the 'exports' of import/require, such as 'foo' in the: import { foo } from './fooFile'
                        importedFiles.forEach((imp, importIdx) => {
                            if (exportPath)
                                return
                            let found = imp && imp.exports ? imp.exports.find(e => e.varName && obj.varFileName && (e.varName == obj.varFileName)) : null
                            if (found) {
                                if (imp.isDirectory && found.path) {
                                    exportPath = found.path
                                    idx = importIdx
                                } else if (imp.isDirectory && !found.path) {
                                    exportPath = imp.fileName
                                    idx = importIdx
                                }
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

                        obj.routeMiddlewares = routeMiddlewares.filter(r => {
                            if (r.position == postion)
                                return true

                            if (r.path === false && r.position < postion) {
                                return true
                            }

                            // if ((r.path !== false) && (r.path === obj.path) || (r.fixedRoute === true))  // TODO: verify 'fixedRoute'
                            if ((r.path !== false) && (r.path && obj.path && r.path.split(obj.path)[0] === '') && r.position < postion)
                                return true

                            return false
                        })

                        obj.fileName = pathFile
                        var auxRelativePath = obj.fileName.split('/')
                        auxRelativePath.pop()
                        auxRelativePath = auxRelativePath.join('/')

                        if (idx > -1 && importedFiles[idx] && importedFiles[idx].isDirectory && !exportPath) {
                            var extension = await getExtension(obj.fileName + '/index')
                            var auxPaths = await readEndpointFile(obj.fileName + '/index' + extension, (obj.path || ''), obj.fileName, obj.routeMiddlewares, null)
                            if (auxPaths)
                                allPaths = { ...paths, ...allPaths, ...auxPaths }
                            else
                                allPaths = { ...paths, ...allPaths }
                        } else {
                            let refFunction = null
                            var extension = await getExtension(obj.fileName)

                            if (refFunc) {
                                refFunction = await functionRecognizerInFile(obj.fileName + extension, refFunc)
                            }

                            var auxPaths = await readEndpointFile(obj.fileName + extension, routePrefix + (obj.path || ''), auxRelativePath, obj.routeMiddlewares, refFunction)
                            if (auxPaths) {
                                allPaths = merge(paths, allPaths, { arrayMerge: overwriteMerge })
                                allPaths = merge(allPaths, auxPaths, { arrayMerge: overwriteMerge })
                            } else
                                allPaths = merge(paths, allPaths, { arrayMerge: overwriteMerge })
                        }
                    } else {
                        allPaths = merge(paths, allPaths, { arrayMerge: overwriteMerge })
                    }
                    if (file == aRoutes.length - 1)
                        return resolve(allPaths)
                }
            }
            return resolve(merge(paths, allPaths, { arrayMerge: overwriteMerge }))
        })
    })
}

/**
 * TODO: fill
 * @param {*} aDataRaw 
 * @param {*} relativePath 
 */
function getImportedFiles(aDataRaw, relativePath) {
    return new Promise(async (resolve, reject) => {
        var importedFiles = []
        var importeds = aDataRaw.split(new RegExp(`import`, "i"))
        var requireds = aDataRaw.replaceAll('\n', ' ').split(new RegExp(`\\s*\\t*const\\s+|\\s*\\t*var\\s+|\\s*\\t*let\\s+`, "i"))
        requireds = requireds.filter(e => e.split(new RegExp(`=\\s*\\t*require\\s*\\t*\\(`, "i")).length > 1)

        // Such as: import foo, { Foo } from './foo'
        if (importeds && importeds.length > 1) {
            importeds.shift()

            // TODO: refactor this. Pass to outside
            var tsPaths = []
            var tsconfig = await getFileContent(process.cwd() + '/tsconfig.json')
            if (tsconfig) {
                tsconfig = await handleData.removeComments(tsconfig)
                tsconfig = JSON5.parse(tsconfig)    // Allow trailing commas
                tsPaths = tsconfig.compilerOptions && tsconfig.compilerOptions.paths && typeof tsconfig.compilerOptions.paths === 'object' ? Object.entries(tsconfig.compilerOptions.paths) : []
            }

            for (let index = 0; index < importeds.length; ++index) {
                let imp = importeds[index]
                var obj = { varFileName: null, fileName: null, exports: [] }
                var varFileName = imp.split(new RegExp(`from`, "i"))[0].trim()
                if (varFileName.includes('{')) {

                    // TODO: handle alias 'as'

                    if (varFileName.split(new RegExp(",\\s*\\n*\\t*{")).length > 1) {     // such as: import foo, { Foo } from './foo'
                        obj.varFileName = varFileName.split('{')[0].replaceAll(',', '').trim()
                    }
                    varFileName = varFileName.replaceAll('\n', '')
                    varFileName.split('{')[1].split(',').forEach(exp => {
                        exp = exp.replaceAll('{', '').replaceAll('}', '').replaceAll(',', '').trim()
                        if (exp == '')
                            return

                        if (exp.includes(' as ')) {    // alias
                            obj.exports.push({ varName: exp.split(' as ')[0], varAlias: exp.split(' as ')[1], path: null })
                        } else {
                            obj.exports.push({ varName: exp, varAlias: null, path: null })
                        }
                    })
                } else {
                    obj.varFileName = varFileName
                }

                // REFACTOR
                var fileName = imp.split(new RegExp(";|\n"))[0].trim()
                if (fileName && fileName.split(new RegExp(" from |\\}\\s*from\\s*\\\"?\\\'?\\\`?", "i")).length > 1) {
                    fileName = fileName.split(new RegExp(" from |\\}\\s*from\\s*\\\"?\\\'?\\\`?", "i"))[1].trim()
                } else if (imp.split(new RegExp(" from |\\}\\s*from\\s*\\\"?\\\'?\\\`?", "i")).length > 1) {
                    fileName = imp.split(new RegExp(" from |\\}\\s*from\\s*\\\"?\\\'?\\\`?", "i"))[1].trim()
                }
                fileName = fileName.split(new RegExp("\\n|\\;"))[0].trim()
                fileName = fileName.replaceAll('\'', '').replaceAll('\"', '').replaceAll('\`', '').replaceAll(' ', '').replaceAll(';', '').replaceAll('\n', '')

                if (fileName[0] === '@') {    // reference to tsconfig.json
                    var refFileName = fileName.split('/')[0]
                    var found = tsPaths.find(path => path && path[0] && (path[0].split('/')[0] == refFileName) ? true : false)
                    if (found) {
                        if (Array.isArray(found[1])) {
                            var realPath = found[1][0]
                            if (realPath) {
                                realPath = realPath.replaceAll('/*', '')
                                fileName = './' + fileName.replace(refFileName, realPath)
                                relativePath = relativePath.split('/')
                                var rootPath = realPath ? realPath.split('/')[0] : null
                                var rootFound = false

                                relativePath = relativePath.filter(path => {
                                    if (rootFound)
                                        return false
                                    if (path == rootPath) {
                                        rootFound = true
                                        return false
                                    }
                                    return true
                                })

                                relativePath = relativePath.join('/')
                            }
                        }
                    }
                }

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
            for (let index = 0; index < requireds.length; ++index) {
                let req = requireds[index]
                var obj = { varFileName: null, fileName: null, exports: [] }
                var varFileName = req.split(new RegExp(`=\\s*\\t*require\\s*\\t*\\(`, "i"))[0].trim()

                if (varFileName.includes('{')) {

                    if (varFileName.split(new RegExp(",\\s*\\t*{")).length > 1) {     // such as: import foo, { Foo } from './foo'
                        obj.varFileName = varFileName.split('{')[0].replaceAll(',', '').trim()
                    }
                    varFileName = varFileName.replaceAll('\n', '')
                    varFileName.split('{')[1].split(',').forEach(exp => {
                        exp = exp.replaceAll('{', '').replaceAll('}', '').replaceAll(',', '').trim()
                        if (exp == '')
                            return

                        if (exp && exp.includes(' as ')) {    // alias
                            obj.exports.push({ varName: exp.split(' as ')[0], varAlias: exp.split(' as ')[1], path: null })
                        } else {
                            obj.exports.push({ varName: exp, varAlias: null, path: null })
                        }
                    })
                } else {
                    obj.varFileName = varFileName
                }

                var fileName = req.split(new RegExp(`=\\s*\\t*require\\s*\\t*\\(`, "i"))[1].trim()
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

                        // Checking if reference is to file
                        if (obj.isDirectory) {
                            let indexExtension = await getExtension(pathFile + '/index')
                            if (indexExtension != '') {     // index exist
                                let dataFile = await getFileContent(pathFile + '/index' + indexExtension)
                                dataFile = await handleData.removeComments(dataFile)
                                const isRequireDirLib = dataFile && dataFile.split(new RegExp("\\s*\\n*\\t*module\\s*\\n*\\t*\\.\\s*\\n*\\t*exports\\s*\\n*\\t*\\=\\s*\\n*\\t*require\\s*\\n*\\t*\\(\\s*\\n*\\t*.require\\-dir.\\s*\\n*\\t*\\)")).length > 1 ? true : false
                                if (isRequireDirLib) {        // lib require-dir
                                    obj.isRequireDirLib = isRequireDirLib
                                } else {
                                    // TODO: Verify other cases

                                    let relativePath = obj.fileName
                                    obj.exports.map(oExp => {
                                        if (dataFile.split(new RegExp(`${oExp}\\s*\\n*\\t*\\=\\s*\\n*\\t*require\\s*\\n*\\t*\\(`)).length > 1) {
                                            let addPath = dataFile.split(new RegExp(`${oExp}\\s*\\n*\\t*\\=\\s*\\n*\\t*require\\s*\\n*\\t*\\(\\s*\\n*\\t*`))
                                            addPath = addPath[1].split(')')[0].replaceAll('\'', '').replaceAll('\"', '').replaceAll('\`', '')

                                            if (addPath.includes("../")) {  // REFACTOR: pass to funcion
                                                var foldersToBack = addPath.split("../").length - 1
                                                var RelativePathBacked = relativePath.split('/')
                                                RelativePathBacked = RelativePathBacked.slice(0, (-1) * foldersToBack)
                                                RelativePathBacked = RelativePathBacked.join('/')

                                                oExp.path = RelativePathBacked + '/' + addPath.replaceAll('../', '')
                                            } else {
                                                oExp.path = relativePath + addPath.replaceAll('./', '/')
                                            }
                                        }
                                    })
                                }
                            }
                        }
                        importedFiles.push(obj)
                    }
                }
            }
        }
        return resolve(importedFiles)
    })
}

/**
 * TODO: fill
 * @param {*} fileName 
 * @param {*} refFuncao 
 * @param {*} isRecursive To avoid infinite loop in case of recursion
 */
function functionRecognizerInFile(fileName, refFuncao, isRecursive = true) {
    return new Promise((resolve, reject) => {
        fs.readFile(fileName, 'utf8', async function (err, data) {
            if (err)
                return resolve(null)

            var cleanedData = data
            cleanedData = await handleData.removeComments(cleanedData, true)
            cleanedData = cleanedData.replaceAll(" async ", ' ')
            cleanedData = cleanedData.split(new RegExp("\\=\\s*async\\s*\\("))
            cleanedData = cleanedData.join('= (')
            cleanedData = cleanedData.split(new RegExp("\\=\\s*function\\s*\\("))
            cleanedData = cleanedData.join('= (')
            cleanedData = cleanedData.split(new RegExp("\\:\\s*function\\s*\\("))
            cleanedData = cleanedData.join(': (')
            cleanedData = cleanedData.replaceAll(" function ", ' ')

            // TODO: pass to function
            // adding '(' and ')' to arrow functions without '(' and ')', such as: ... async req => {
            if (cleanedData.split(new RegExp("\\s*\\n*\\t*=>\\s*\\n*\\t*").length > 1)) {
                let params = cleanedData.trim().split(new RegExp("\\s*\\n*\\t*=>\\s*\\n*\\t*"))
                for (let idx = 0; idx < params.length - 1; idx += 2) {
                    let param = params[idx]
                    if (param && param.slice(-1)[0] !== ')') {
                        let aux = param.split(new RegExp("\\s|\\n|\\t|\\="))
                        aux = aux.slice(-1)[0]
                        param = param.split(aux)
                        param.pop()
                        param = param.join(aux)
                        param += '(' + aux + ')'
                        params[idx] = param
                    }
                }
                cleanedData = params.join(" => ")
            }

            cleanedData = cleanedData.split(new RegExp("=>\\s*\\n*\\t*=>"))
            cleanedData = cleanedData.join("=>")

            if (refFuncao) { // When file has more than one exported function
                var funcStr = await handleData.functionRecognizerInData(cleanedData, refFuncao)

                /**
                 * CASE: Referenced function, such as: module.exports = { foo: require('./fooFile').foo } in index file
                 * Issue: #29
                 */
                if (!funcStr && cleanedData && isRecursive === true && fileName && fileName.split('/').length > 1 && fileName.split('/').slice(-1)[0].includes('index.')) {
                    let path = null
                    let exports = cleanedData.split(new RegExp(`[\\s+|\\{|\\,]${refFuncao}\\s*\\:\\s*require\\s*\\(`))
                    if (exports.length > 1) {
                        let exp = exports[1].split(new RegExp("\\,|\\}"))[0]
                        exp = exp.split(new RegExp("\\s*\\)\\s*\\.\\s*"))
                        path = exp[0].replaceAll('\"', '').replaceAll('\'', '').replaceAll('\`', '').replaceAll(' ', '')
                        if (exp.length > 1) {
                            refFuncao = exp[1].trim().split(/\(|\)|\{|\}|\[|\]|\/|\\|\;|\:|\!|\@|\$|\#|\=|\?|\+|\,|\||\&|\*|\t|\n| /)[0].replaceAll(' ', '')
                        } else {
                            refFuncao = null
                        }

                        let relativePath = fileName.split('/').slice(0, -1).join('/')
                        // TODO: Pass to function
                        if (path && path.includes('./')) {
                            if (path.includes("../")) {
                                let foldersToBack = path.split("../").length - 1
                                let RelativePathBacked = relativePath.split('/')
                                RelativePathBacked = RelativePathBacked.slice(0, (-1) * foldersToBack)
                                RelativePathBacked = RelativePathBacked.join('/')

                                path = RelativePathBacked + '/' + path.replaceAll('\'', '').replaceAll('\"', '').replaceAll('\`', '').replaceAll(' ', '').replaceAll('\n', '').replaceAll('../', '')
                            } else {
                                path = relativePath + path.replaceAll('\'', '').replaceAll('\"', '').replaceAll('\`', '').replaceAll(' ', '').replaceAll('\n', '').replaceAll('./', '/')
                            }
                        }

                        if (path) {
                            let extension = await getExtension(path)
                            funcStr = await functionRecognizerInFile(path + extension, refFuncao, false)
                        }
                    }
                }
                /* END CASE */

                return resolve(funcStr)
            } else { // When file has only one exported function
                cleanedData = cleanedData.replaceAll('\n', ' ').replaceAll('  ', ' ').replaceAll('  ', ' ')
                if (cleanedData.split(new RegExp("export\\s*\\t*default\\s*\\t*\\=*\\s*\\t*\\(.+\\).+\\{")).length > 1) {
                    let directPattern = cleanedData.split(new RegExp("export\\s*\\t*default\\s*\\t*\\=*\\s*\\t*\\(.+\\).+\\{"))
                    if (directPattern.length > 1)
                        directPattern = true
                    else
                        directPattern = false

                    if (directPattern) { // Direct declaration in module.exports
                        var funcStr = await handleData.functionRecognizerInData(cleanedData, `export\\s*default`)
                        return resolve(funcStr)
                    } else { // Indirect declaration in module.exports
                        var funcName = cleanedData.split(new RegExp("export\\s*\\n*\\t*default\\s*\\n*\\t*"))
                        if (funcName[1])
                            funcName = funcName[1].split(/\n|\s|\t|\;|\{|\}|\(|\)|\[|\]/)
                        else
                            return resolve(null)    // TODO: Verify 'null' case 
                        var funcStr = await handleData.functionRecognizerInData(cleanedData, funcName[0])
                        return resolve(funcStr)
                    }
                } else {
                    let directPattern = cleanedData.split(new RegExp(`module\\s*\\n*\\t*\\.\\s*\\n*\\t*exports\\s*\\n*\\t*\\=*\\s*\\n*\\t*\\(.+\\).+\\{`))
                    if (directPattern.length > 1)
                        directPattern = true
                    else
                        directPattern = false

                    if (directPattern) { // Direct declaration in module.exports
                        var funcStr = await handleData.functionRecognizerInData(cleanedData, `module\\.exports`)
                        return resolve(funcStr)
                    } else { // Indirect declaration in module.exports
                        var funcName = cleanedData.split(new RegExp("module\\s*\\n*\\t*\\.\\s*\\n*\\t*exports\\s*\\n*\\t*\\=\\s*\\n*\\t*"))
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

/**
 * TODO: fill
 * @param {*} fileName 
 */
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

/**
 * TODO: fill
 * @param {*} pathFile 
 */
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
