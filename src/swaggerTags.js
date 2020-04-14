
const tables = require('./tables')

const swaggerObj = '#swagger'
const aMethods = ['get', 'head', 'post', 'put', 'delete', 'patch', 'options']
let lang = 'en'

function getSwaggerObj() {
    return swaggerObj
}

function getLanguage() {
    return lang
}

function setLanguage(newLang) {
    lang = newLang
    return lang
}

function formatDefinitions(def, resp = {}) {
    if (Array.isArray(def))
        resp = { type: "array", items: {} }
    else
        resp = { type: "object", properties: {} }
    Object.entries(def).forEach(elem => {
        if (typeof elem[1] === 'object') {  // Array or object
            if (resp.type == 'array') {
                resp.items = { ...formatDefinitions(elem[1], resp) }
            } else
                resp.properties[elem[0]] = formatDefinitions(elem[1], resp)
        } else {
            if (resp.type == 'array')
                resp.items.properties[elem[0]] = { type: typeof elem[1] }
            else {
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
    return resp
}

// Path and #swagger.path
function getPath(elem, line, autoMode) {
    let path = false
    if (autoMode && !elem.includes(swaggerObj + '.path')) {
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
    } else if (elem.includes(swaggerObj + '.path'))  // Search for #swagger.path
        path = elem.split(swaggerObj + '.path')[1].replaceAll(' ', '').replaceAll('\'', '\"').replaceAll('`', '\"').split('=')[1].getBetweenStrs('\"', '\"')
    else
        path = "/_undefined_path_0x" + elem.length.toString(16)
    return path
}

// Get mathod in *.get, *.post and so on; Get #swagger.method
function getMethod(elem, line, autoMode, aDataRaw) {
    let method = false
    if (autoMode && !elem.includes(swaggerObj + '.method')) {
        const dataOneLine = aDataRaw.replaceAll('\n', '').replaceAll('//', '').replaceAll(' ', '') // used to get methods
        method = dataOneLine.split(line.replaceAll(' ', ''))[0].split('.').slice(-1)[0].split('(')[0].trim()
    } else if (elem.includes(swaggerObj + '.method')) // Search for #swagger.method
        method = elem.split(swaggerObj + '.method')[1].replaceAll(' ', '').replaceAll('\'', '\"').replaceAll('`', '\"').split('=')[1].getBetweenStrs('\"', '\"')
    else
        throw console.error("\nError: 'method' not found.")

    if (!aMethods.includes(method)) {
        method = 'get'
    }
    return method
}

// Get #swagger.start and #swagger.end
function getForcedEndpoints(aData) {
    let aForcedsEndpoints = aData.split(new RegExp(".*#swagger.start.*|.*#swagger.end.*"))
    if (aForcedsEndpoints.length > 1) {
        aForcedsEndpoints = aForcedsEndpoints.filter((_, idx) => idx % 2 != 0)
        aForcedsEndpoints = aForcedsEndpoints.map((e) => e = "'/_undefined_path_0x" + e.length.toString(16) + "', " + e)
    } else
        aForcedsEndpoints = []
    return aForcedsEndpoints
}

// Search for #swagger.ignore
function getIgnoreTag(elem) {
    if (elem.includes(swaggerObj + '.ignore'))
        if (elem.split(swaggerObj + '.ignore')[1].replaceAll(' ', '').split('=')[1].slice(0, 4) == 'true')
            return true
    return false
}

// Search for #swagger.auto = false   (by default is true)
function getAutoTag(elem) {
    if (elem.includes(swaggerObj + '.auto'))
        if (elem.split(swaggerObj + '.auto')[1].replaceAll(' ', '').split('=')[1].slice(0, 5) == 'false')
            return false
    return true
}

function getParametersTag(line, paramName, objParameters) {
    let name = paramName.replaceAll('\"', '\'').replaceAll('`', '\'').getBetweenStrs('\'', '\'')
    objParameters[name] = { name, ...objParameters[name], ...eval(`(${line.split('=')[1]})`) }
    if (objParameters[name].schema && !objParameters[name].schema.$ref)
        objParameters[name].schema = formatDefinitions(objParameters[name].schema)
    return objParameters
}

function getProducesTag(line, objEndpoint, path, method) {
    objEndpoint[path][method].produces = eval(line.replaceAll("__¬¬¬__", "\"").split('=')[1])
    return objEndpoint
}

function getConsumesTag(line, objEndpoint, path, method) {
    objEndpoint[path][method].consumes = eval(line.replaceAll("__¬¬¬__", "\"").split('=')[1])
    return objEndpoint
}

function getResponsesTag(line, paramName, objResponses) {
    paramName = paramName.replaceAll('\"', '\'').replaceAll('`', '\'')
    let statusCode = paramName.includes('\'') ? paramName.getBetweenStrs('\'', '\'') : paramName.getBetweenStrs('[', ']')
    let objResp = eval(`(${line.split('=')[1]})`)
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


module.exports = {
    formatDefinitions,
    getLanguage,
    setLanguage,
    getPath,
    getMethod,
    getForcedEndpoints,
    getSwaggerObj,
    getIgnoreTag,
    getAutoTag,
    getParametersTag,
    getProducesTag,
    getConsumesTag,
    getResponsesTag
}