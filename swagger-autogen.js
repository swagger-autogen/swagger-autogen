
const fs = require('fs')
require('./src/prototype-functions')
const tables = require('./src/tables')
const swaggerTags = require('./src/swaggerTags')

var symbols = require('figures')

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
                    let obj = await readEndpointFile(filePath)
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
                return resolve ({success: true, data: objDoc})
            } catch (err) {
                console.log('Swagger-autogen:', "\x1b[31m", 'Failed ' + symbols.cross, "\033[0m")
                return resolve ({success: false, data: null})
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

    let regex = "\\.get\\s*\\(|\\.head\\s*\\(|\\.post\\s*\\(|\\.put\\s*\\(|\\.delete\\s*\\(|\\.patch\\s*\\(|\\.options\\s*\\("
    let aData = data.replaceAll('\n', unusualString)
    aData = aData.replaceAll('\t', ' ')
    aData = aData.replaceAll("Content-Type", "content-type")
    aData = aData.replaceAll("CONTENT-TYPE", "content-type")
    aData = aData.replaceAll("\"content-type\"", "__¬¬¬__content-type__¬¬¬__").replaceAll("\"application/json\"", "__¬¬¬__application/json__¬¬¬__").replaceAll("\"application/xml\"", "__¬¬¬__application/xml__¬¬¬__")
    aData = aData.replaceAll("\'content-type\'", "__¬¬¬__content-type__¬¬¬__").replaceAll("\'application/json\'", "__¬¬¬__application/json__¬¬¬__").replaceAll("\'application/xml\'", "__¬¬¬__application/xml__¬¬¬__")
    aData = aData.replaceAll("\`content-type\`", "__¬¬¬__content-type__¬¬¬__").replaceAll("\`application/json\`", "__¬¬¬__application/json__¬¬¬__").replaceAll("\`application/xml\`", "__¬¬¬__application/xml__¬¬¬__")
    aData = aData.replaceAll('/*', '\n/*').split(new RegExp("\\/\\*((?!\\#swagger\\.).)*\\*\\/", "g")).filter((_, idx) => idx % 2 == 0).join('') // only group 0 | Delete all comments that not contains #swagger. /*...*/
    aData = aData.replaceAll(unusualString, '\n')
    aData = aData.split(new RegExp("\\/.*(\\(|\\)).*\\/", "gm")).filter((_, idx) => idx % 2 == 0).join('') // only group 0 | Delete all regular expresions that contains ')' ou '(' to avoid trouble finding the end of the function 
    aData = aData.split(new RegExp("\".*(" + regex + ")")).filter((_, idx) => idx % 2 == 0).join('\"') // only group 0 | Delete standard that contains double quotes and .get, .post, etc in same line
    aData = aData.split(new RegExp("\'.*(" + regex + ")")).filter((_, idx) => idx % 2 == 0).join('\'') // only group 0 | Delete standard that contains single quotes and .get, .post, etc in same line
    aData = aData.split(new RegExp("\`.*(" + regex + ")")).filter((_, idx) => idx % 2 == 0).join('\`') // only group 0 | Delete standard that contains template string and .get, .post, etc in same line
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
    if (req && elem.split(new RegExp(" .*?\\s*=\\s*" + req + "\\.query(\\s|\\n|;)", "gm").length > 1)) {
        let queryVars = []
        var aQuerys = elem.split(new RegExp("\\s*=\\s*" + req + "\\.query(\\s|\\n|;)"))
        aQuerys = aQuerys.slice(0, -1)

        if (aQuerys.length > 0) {
            // get variables name
            for (let idx = 0; idx < aQuerys.length - 1; idx++) {
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

function readEndpointFile(filePath) {
    return new Promise((resolve, reject) => {
        let paths = {}
        fs.readFile(filePath, 'utf8', function (err, data) {
            if (err) throw console.error(err)
            let regex = "\\.get\\s*\\(|\\.head\\s*\\(|\\.post\\s*\\(|\\.put\\s*\\(|\\.delete\\s*\\(|\\.patch\\s*\\(|\\.options\\s*\\("
            let aData = clearData(data)
            let serverVar = null
            if (aData.includes(swaggerObj + '.patterns')) {
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
                    regex += `( |\\t|\\n|;|\\*\\/)${pattern}.get\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.head\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.post\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.put\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.delete\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.patch\\s*\\(|( |\\t|\\n|;|\\*\\/)${pattern}.options\\s*\\(|`
                })
                regex = regex.slice(0, -1)
            } else {    // Automatic
                serverVar = aData.split(new RegExp(regex))[0].split(/\n| |\t|';'|\{|\}|\(|\)|\[|\]/).splice(-1)[0]  // ex.: app, route, server, etc.      
                if (serverVar)
                    regex = `( |\\t|\\n|;|\\*\\/)${serverVar}.get\\s*\\(|( |\\t|\\n|;|\\*\\/)${serverVar}.head\\s*\\(|( |\\t|\\n|;|\\*\\/)${serverVar}.post\\s*\\(|( |\\t|\\n|;|\\*\\/)${serverVar}.put\\s*\\(|( |\\t|\\n|;|\\*\\/)${serverVar}.delete\\s*\\(|( |\\t|\\n|;|\\*\\/)${serverVar}.patch\\s*\\(|( |\\t|\\n|;|\\*\\/)${serverVar}.options\\s*\\(`
            }
            let aForcedsEndpoints = swaggerTags.getForcedEndpoints(aData)
            const aDataRaw = aData
            aData = [...aData.split(new RegExp(regex)), ...aForcedsEndpoints]
            aData[0] = undefined    // Delete 'header' in file
            aData = aData.filter(data => {
                if (data && data.replaceAll('\n', '').replaceAll(' ', '').replaceAll('\t', '') != '')
                    return true
                return false
            })
            aData.forEach(elem => {
                if (!elem) return
                elem = getFunction(elem)
                elem = elem.replaceAll('\n', '').replaceAll('/*', '\n').replaceAll('*/', '\n').replaceAll(swaggerObj, '\n' + swaggerObj)
                let objEndpoint = {}
                let path = false
                let method = false
                let req = null
                let res = null
                let next = null
                let autoMode = true
                let objParameters = {}
                let objResponses = {}

                if (swaggerTags.getIgnoreTag(elem))
                    return

                autoMode = swaggerTags.getAutoTag(elem)

                const aElem = elem.split(/;|\n/)
                // aElem.forEach(line => {
                for (var _idx in aElem) {
                    const line = aElem[_idx]

                    if (!path) {    // First
                        path = swaggerTags.getPath(elem, line, autoMode)
                        objEndpoint[path] = {}
                    }
                    if (!method) {
                        method = swaggerTags.getMethod(elem, line, autoMode, aDataRaw)
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
                        const callbackParameters = getCallbackParameters(line)
                        req = callbackParameters.req
                        res = callbackParameters.res
                        next = callbackParameters.next
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
                //})

                // req | res: Last, because must eliminate comments and strings to get .status only from the code.
                if (autoMode && (req || res)) {
                    elem = elem.split(new RegExp("/\\*(.)*?\\*/")).filter((_, idx) => idx % 3 == 0).join('')    // Delete all comments /*...*/
                    elem = elem.split(new RegExp("([\"'`])((?:\\\\\\1|.)*?)\\1")).filter((_, idx) => idx % 3 == 0).join('')  // Delete all string
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
            })
            return resolve(paths)
        })
    })
}
