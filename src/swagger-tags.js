
const tables = require('./tables')
const statics = require('./statics')

let lang = 'en'
let definitions = {}

function getLanguage() {
    return lang
}

function setLanguage(newLang) {
    lang = newLang
    return lang
}

// Used to reference
function setDefinitions(def) {
    definitions = def
}

// TODO: Refactor
function formatDefinitions(def, resp = {}) {
    if (def.$ref) {
        let param = def.$ref.split('#/definitions/')[1].replaceAll(' ', '')
        return { xml: { name: param.toLowerCase() }, $ref: def.$ref }
    }
    let arrayOf = null
    if (typeof def === 'string') {
        resp.type = "string"
        resp[def] = { example: def }
    } else if (typeof def === 'number') {
        resp.type = "number"
        resp[def] = { example: def }
    } else if (typeof def === 'boolean') {
        resp.type = "boolean"
        resp[def] = { example: def }
    } else {
        if (Array.isArray(def)) {
            resp = { type: "array", items: {} }
            arrayOf = typeof def[0]
        } else
            resp = { type: "object", properties: {} }
        Object.entries(def).forEach(elem => {
            if (typeof elem[1] === 'object') {  // Array or object
                if (resp.type == 'array') {
                    resp.items = { ...formatDefinitions(elem[1], resp) }
                } else {
                    resp.properties[elem[0]] = formatDefinitions(elem[1], resp)
                }
            } else {
                if (resp.type == 'array') {
                    if (arrayOf == 'object') {
                        if (!resp.items.properties)
                            resp.items.properties = {}
                        resp.items.properties[elem[0]] = { type: typeof elem[1] }
                    } else
                        resp.items = { type: typeof elem[1] }
                } else {
                    if (elem[0][0] == '$') {  // Required parameter
                        elem[0] = elem[0].slice(1)
                        if (!resp.required)
                            resp.required = []
                        resp.required.push(elem[0])
                    }
                    resp.properties[elem[0]] = { type: typeof elem[1], example: elem[1] }
                }
            }
        })
    }
    return resp
}

// Path and #swagger.path
function getPath(elem, line, autoMode) {
    let path = false
    if (autoMode && !elem.includes(statics.SWAGGER_TAG + '.path')) {
        if (line.split(',').length > 0 && (line.split('\"').length > 2 || line.split('\'').length > 2 || line.split('`').length > 2)) {
            path = line.replaceAll('\'', '"').replaceAll('`', '"').replaceAll(' ', '').split('"')[1].split('"')[0]
            path = path.split('/').map(p => {
                if (p.includes(':'))
                    p = '{' + p.replaceAll(':', '') + '}'
                return p
            })
            path = path.join('/')
        } else {
            path = "/_undefined_path_0x" + elem.length.toString(16)
        }
    } else if (elem.includes(statics.SWAGGER_TAG + '.path'))  // Search for #swagger.path
        path = elem.split(statics.SWAGGER_TAG + '.path')[1].replaceAll(' ', '').replaceAll('\'', '\"').replaceAll('`', '\"').split('=')[1].getBetweenStrs('\"', '\"')
    else
        path = "/_undefined_path_0x" + elem.length.toString(16)
    return path
}

// Get method in *.get, *.post and so on; Get #swagger.method
function getMethod(elem, line, autoMode, aDataRaw) {
    let method = false
    if (autoMode && !elem.includes(statics.SWAGGER_TAG + '.method')) {
        const dataOneLine = aDataRaw.replaceAll('\n', '').replaceAll('//', '').replaceAll(' ', '') // used to get methods
        method = dataOneLine.split(line.replaceAll(' ', ''))[0].split('.').slice(-1)[0].split('(')[0].trim()
    } else if (elem.includes(statics.SWAGGER_TAG + '.method')) // Search for #swagger.method
        method = elem.split(statics.SWAGGER_TAG + '.method')[1].replaceAll(' ', '').replaceAll('\'', '\"').replaceAll('`', '\"').split('=')[1].getBetweenStrs('\"', '\"')
    else
        throw console.error("\nError: 'method' not found.")

    if (!statics.METHODS.includes(method)) {
        method = 'get'
    }
    return method
}

// Get #swagger.start and #swagger.end
function getForcedEndpoints(aData) {
    let aForcedsEndpoints = aData.split(new RegExp(".*#swagger.start.*|.*#swagger.end.*", "i"))
    if (aForcedsEndpoints.length > 1) {
        aForcedsEndpoints = aForcedsEndpoints.filter((_, idx) => idx % 2 != 0)
        aForcedsEndpoints = aForcedsEndpoints.map((e) => {
            let method = e.split(new RegExp("#swagger\\.method\\s*\\=\\s*"))
            if (method.length > 1) {
                method = method[1].split(/\n|\;/)
                method = method[0].replaceAll('\"', '').replaceAll('\'', '').replaceAll('\`', '').replaceAll(' ', '')
            } else {
                method = 'get'
            }
            return e = "[_[" + method + "]_])('/_undefined_path_0x" + e.length.toString(16) + "', " + e
        })
    } else
        aForcedsEndpoints = []
    return aForcedsEndpoints
}

// Search for #swagger.ignore
function getIgnoreTag(elem) {
    if (elem.includes(statics.SWAGGER_TAG + '.ignore'))
        if (elem.split(statics.SWAGGER_TAG + '.ignore')[1].replaceAll(' ', '').split('=')[1].slice(0, 4) == 'true')
            return true
    return false
}

// Search for #swagger.auto = false   (by default is true)
function getAutoTag(elem) {
    if (elem.includes(statics.SWAGGER_TAG + '.auto'))
        if (elem.split(statics.SWAGGER_TAG + '.auto')[1].replaceAll(' ', '').split('=')[1].slice(0, 5) == 'false')
            return false
    return true
}

function getParametersTag(line, paramName, objParameters) {
    let name = paramName.replaceAll('\"', '\'').replaceAll('`', '\'').getBetweenStrs('\'', '\'')
    try {   // Handling syntax error
        objParameters[name] = { name, ...objParameters[name], ...eval(`(${line.split('=')[1]})`) }
    } catch (err) {
        console.error('Syntax error: ' + line)
        console.error(err)
        return false
    }
    if (objParameters[name].schema && !objParameters[name].schema.$ref)
        objParameters[name].schema = formatDefinitions(objParameters[name].schema)
    return objParameters
}

function getProducesTag(line, objEndpoint, path, method) {
    try {   // Handling syntax error
        objEndpoint[path][method].produces = eval(line.replaceAll("__¬¬¬__", "\"").split('=')[1])
    } catch (err) {
        console.error('Syntax error: ' + line)
        console.error(err)
        return false
    }
    return objEndpoint
}

function getConsumesTag(line, objEndpoint, path, method) {
    try {   // Handling syntax error
        objEndpoint[path][method].consumes = eval(line.replaceAll("__¬¬¬__", "\"").split('=')[1])
    } catch (err) {
        console.error('Syntax error: ' + line)
        console.error(err)
        return false
    }
    return objEndpoint
}

function getResponsesTag(line, paramName, objResponses) {
    paramName = paramName.replaceAll('\"', '\'').replaceAll('`', '\'')
    let statusCode = paramName.includes('\'') ? paramName.getBetweenStrs('\'', '\'') : paramName.getBetweenStrs('[', ']')
    let objResp = null;
    try { // Handling syntax error
        objResp = eval(`(${line.split('=')[1]})`)
    } catch (err) {
        console.error('Syntax error: ' + line)
        console.error(err)
        return false
    }
    if (objResp && objResp.schema && !objResp.schema.$ref) {
        objResponses[statusCode] = { ...objResponses[statusCode], ...objResp, schema: formatDefinitions(objResp.schema) }
        if (objResponses[statusCode].xmlName) {
            objResponses[statusCode].schema['xml'] = { name: objResponses[statusCode].xmlName }
            delete objResponses[statusCode].xmlName
        } else
            objResponses[statusCode].schema['xml'] = { name: 'main' }
    } else
        objResponses[statusCode] = { ...objResponses[statusCode], ...objResp }
    if (!objResponses[statusCode].description)
        objResponses[statusCode].description = tables.getHttpStatusDescription(statusCode, lang)
    return objResponses
}

function getRouter(aDataRaw) {
    if (!aDataRaw)
        return null
    var aDataRawSplited = aDataRaw.split('\n')
    for (let idx = 0; idx < aDataRawSplited.length; idx++) {
        var elem = aDataRawSplited[idx]

        if (elem.split(new RegExp(`(const|var|let)\\s*\\w*\\s*=\\s*.*Router\\s*\\(.*\\)`, "i")).length > 1) {
            var varRoute = elem.split(' ')[1].split('=')[0].replaceAll(' ', '')
            return varRoute
        }
    }

    if (aDataRaw.includes(statics.SWAGGER_TAG + '.router')) { // Search for #swagger.router
        return aDataRaw.split(statics.SWAGGER_TAG + '.router')[1].replaceAll(' ', '').replaceAll('\'', '\"').replaceAll('`', '\"').split('=')[1].getBetweenStrs('\"', '\"')
    }
    return null
}

module.exports = {
    formatDefinitions,
    getLanguage,
    setLanguage,
    getPath,
    getMethod,
    getForcedEndpoints,
    getIgnoreTag,
    getAutoTag,
    getParametersTag,
    getProducesTag,
    getConsumesTag,
    getResponsesTag,
    setDefinitions,
    getRouter
}