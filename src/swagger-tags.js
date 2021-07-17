const tables = require('./tables');
const statics = require('./statics');
const utils = require('./utils');

let lang = 'en';

function getLanguage() {
    return lang;
}

/**
 * TODO: fill
 * @param {*} newLang
 */
function setLanguage(newLang) {
    lang = newLang;
    return lang;
}

/**
 * TODO: fill
 * @param {*} def
 * @param {*} resp
 */
function formatDefinitions(def, resp = {}, constainXML) {
    if (def.$ref) {
        if (def.$ref.split('#/definitions/').length === 1) {
            throw console.error('[Swagger-autogen] Syntax error: ', def.$ref);
        }
        let param = def.$ref.split('#/definitions/')[1].replaceAll(' ', '');
        if (constainXML) {
            return {
                xml: {
                    name: param.toLowerCase()
                },
                $ref: def.$ref
            };
        } else {
            return {
                $ref: def.$ref
            };
        }
    }
    let arrayOf = null;
    if (typeof def === 'string') {
        resp.type = 'string';
        resp.example = def;
    } else if (typeof def === 'number') {
        resp.type = 'number';
        resp.example = def;
    } else if (typeof def === 'boolean') {
        resp.type = 'boolean';
        resp.example = def;
    } else {
        if (Array.isArray(def)) {
            if (def && typeof def[0] !== 'object') {
                resp = {
                    type: 'array',
                    example: def,
                    items: {}
                };
            } else {
                resp = {
                    type: 'array',
                    items: {}
                };
            }
            arrayOf = typeof def[0];
        } else {
            resp = {
                type: 'object',
                properties: {}
            };
        }
        Object.entries(def).forEach(elem => {
            if (typeof elem[1] === 'object') {
                // Array or object
                if (elem[0] && elem[0][0] && elem[0][0] == '$') {
                    // Required parameter
                    elem[0] = elem[0].slice(1);
                    if (!resp.required) {
                        resp.required = [];
                    }
                    resp.required.push(elem[0]);
                }
                if (resp.type == 'array') {
                    resp.items = {
                        ...formatDefinitions(elem[1], resp, constainXML)
                    };
                } else {
                    resp.properties[elem[0]] = formatDefinitions(elem[1], resp, constainXML);
                }
            } else {
                if (resp.type == 'array') {
                    if (arrayOf == 'object') {
                        if (!resp.items.properties) resp.items.properties = {};
                        resp.items.properties[elem[0]] = {
                            type: typeof elem[1]
                        };
                    } else
                        resp.items = {
                            type: typeof elem[1]
                        };
                } else {
                    if (elem[0][0] == '$') {
                        // Required parameter
                        elem[0] = elem[0].slice(1);
                        if (!resp.required) resp.required = [];
                        resp.required.push(elem[0]);
                    }
                    resp.properties[elem[0]] = {
                        type: typeof elem[1],
                        example: elem[1]
                    };
                }
            }
        });
    }
    return resp;
}

/**
 * TODO: fill
 * @param {*} elem
 * @param {*} autoMode
 */
function getPath(elem, autoMode) {
    if (!elem) {
        return null;
    }

    let path = false;
    let line = elem;
    line = line.trim();

    if (autoMode && !elem.includes(statics.SWAGGER_TAG + '.path')) {
        const quotMark = line[0];
        if ((quotMark == '"' || quotMark == "'" || quotMark == '`') && line.split(quotMark).length > 2) {
            line = line.replaceAll(`\\${quotMark}`, statics.STRING_BREAKER + 'quotMark' + statics.STRING_BREAKER); // avoiding problemas caused by: " ... \" ... ", ' ... \' ... ', etc
            path = line.split(quotMark)[1];
            path = path.replaceAll(statics.STRING_BREAKER + 'quotMark' + statics.STRING_BREAKER, `\\${quotMark}`); // avoiding problemas caused by: " ... \" ... ", ' ... \' ... ', etc
            path = path.split('/').map(p => {
                if (p.includes(':')) p = '{' + p.replace(':', '') + '}';
                return p;
            });
            path = path.join('/');
        } else {
            path = '/_undefined_path_0x' + elem.length.toString(16);
        }
    } else if (elem.includes(statics.SWAGGER_TAG + '.path'))
        // Search for #swagger.path
        path = elem
            .split(statics.SWAGGER_TAG + '.path')[1]
            .replaceAll(' ', '')
            .replaceAll("'", '"')
            .replaceAll('`', '"')
            .split('=')[1]
            .getBetweenStrs('"', '"');
    else {
        path = '/_undefined_path_0x' + elem.length.toString(16);
    }
    return path;
}

/**
 * Get #swagger.method
 * @param {string} data
 * @returns
 */
function getMethodTag(data) {
    if (data.includes(statics.SWAGGER_TAG + '.method')) {
        let method = data.split(new RegExp(statics.SWAGGER_TAG + '.method' + '\\s*\\=\\s*'))[1];
        method = popString(method);
        if (method && statics.METHODS.includes(method.toLowerCase())) {
            return method.toLowerCase();
        }
    }
    return false;
}

/**
 * Get #swagger.start and #swagger.end
 * @param {*} aData
 */
function getForcedEndpoints(aData) {
    let aForcedsEndpoints = aData.split(new RegExp('.*#swagger.start.*|.*#swagger.end.*', 'i'));
    if (aForcedsEndpoints.length > 1) {
        aForcedsEndpoints = aForcedsEndpoints.filter((_, idx) => idx % 2 != 0);
        aForcedsEndpoints = aForcedsEndpoints.map(e => {
            let method = e.split(new RegExp('#swagger\\.method\\s*\\=\\s*'));
            if (method.length > 1) {
                method = method[1].split(/\n|;/);
                method = method[0].replaceAll('"', '').replaceAll("'", '').replaceAll('`', '').replaceAll(' ', '');
            } else {
                method = 'get';
            }
            return (e = '[_[' + method + "]_])('/_undefined_path_0x" + e.length.toString(16) + "', " + e);
        });
    } else {
        aForcedsEndpoints = [];
    }
    return aForcedsEndpoints;
}

/**
 * Search for #swagger.ignore
 * @param {*} elem
 */
function getIgnoreTag(elem) {
    if (elem.includes(statics.SWAGGER_TAG + '.ignore'))
        if (
            elem
                .split(statics.SWAGGER_TAG + '.ignore')[1]
                .replaceAll(' ', '')
                .split('=')[1]
                .slice(0, 4) == 'true'
        ) {
            return true;
        }
    return false;
}

/**
 * Search for #swagger.auto = false   (by default is true)
 * @param {*} data
 */
function getAutoTag(data) {
    if (data.includes(statics.SWAGGER_TAG + '.auto')) {
        let auto = data.split(new RegExp(statics.SWAGGER_TAG + '.auto' + '\\s*\\=\\s*'))[1];
        auto = auto.split(new RegExp('\\s|\\n|\\t|\\;'))[0];
        if (auto && auto.toLowerCase() === 'false') {
            return false;
        }
    }
    return true;
}

/**
 * Search for #swagger.deprecated = true   (by default is false)
 * @param {*} data
 */
function getDeprecatedTag(data) {
    if (data.includes(statics.SWAGGER_TAG + '.deprecated')) {
        let deprecated = data.split(new RegExp(statics.SWAGGER_TAG + '.deprecated' + '\\s*\\=\\s*'))[1];
        deprecated = deprecated.split(new RegExp('\\s|\\n|\\t|\\;'))[0];
        if (deprecated && deprecated.toLowerCase() === 'true') {
            return true;
        }
    }
    return false;
}

/**
 * Get the content in '#swagger.parameters'
 * @param {string} data file content
 * @param {object} objParameters
 */
async function getParametersTag(data, objParameters) {
    data = data.replaceAll('"', "'").replaceAll('`', "'").replaceAll('`', "'").replaceAll('\n', ' ');
    let swaggerParameters = data.split(new RegExp('#swagger.parameters'));
    swaggerParameters.shift();
    for (let idx = 0; idx < swaggerParameters.length; ++idx) {
        let parameter = await utils.stack0SymbolRecognizer(swaggerParameters[idx], '{', '}');
        let name = swaggerParameters[idx].split(new RegExp('\\[|\\]'))[1].replaceAll("'", '');

        try {
            objParameters[name] = {
                name,
                ...objParameters[name],
                ...eval(`(${'{' + parameter + '}'})`)
            };
        } catch (err) {
            console.error('Syntax error: ' + parameter);
            console.error(err);
            return false;
        }

        if (!objParameters[name].in) {
            // by default: 'in' is 'query'
            objParameters[name].in = 'query';
        }
        if (!objParameters[name].type && !objParameters[name].schema && objParameters[name].in != 'body') {
            // by default: 'type' is 'string' when 'schema' is missing
            objParameters[name].type = 'string';
        }
        if (objParameters[name].schema && !objParameters[name].schema.$ref) {
            objParameters[name].schema = formatDefinitions(objParameters[name].schema);
        }
    }
    return objParameters;
}

/**
 * Get the content in '#swagger.requestBody'
 * @param {string} data file content
 */
async function getRequestBodyTag(data) {
    let requestBody = {};
    data = data.replaceAll('"', "'").replaceAll('`', "'").replaceAll('`', "'").replaceAll('\n', ' ');
    let swaggerRequestBody = data.split(new RegExp('#swagger.requestBody'));
    swaggerRequestBody.shift();
    for (let idx = 0; idx < swaggerRequestBody.length; ++idx) {
        let parameter = await utils.stack0SymbolRecognizer(swaggerRequestBody[idx], '{', '}');
        parameter = parameter.replaceAll('__¬¬¬__', '"');
        try {
            requestBody = {
                ...eval(`(${'{' + parameter + '}'})`)
            };
        } catch (err) {
            console.error('Syntax error: ' + parameter);
            console.error(err);
            return false;
        }
    }
    return requestBody;
}

/**
 * TODO: fill
 * @param {*} data
 */
async function getProducesTag(data) {
    data = data.replaceAll('\n', ' ').replaceAll('__¬¬¬__', '"');
    let produces = [];
    let swaggerProduces = data.split(new RegExp('#swagger.produces\\s*\\=\\s*'));
    swaggerProduces.shift();
    for (let idx = 0; idx < swaggerProduces.length; ++idx) {
        let prod = await utils.stack0SymbolRecognizer(swaggerProduces[idx], '[', ']');
        try {
            // Handling syntax error
            if (prod) produces = [...produces, ...eval(`(${'[' + prod.toLowerCase() + ']'})`)];
        } catch (err) {
            console.error('Syntax error: ' + prod);
            console.error(err);
            return false;
        }
    }

    // avoid duplicates
    let cleanedProduces = new Set();
    cleanedProduces.add(...produces);
    return [...cleanedProduces];
}

/**
 * TODO: fill
 * @param {*} data
 */
async function getConsumesTag(data) {
    data = data.replaceAll('\n', ' ').replaceAll('__¬¬¬__', '"');
    let consumes = [];
    let swaggerConsumes = data.split(new RegExp('#swagger.consumes\\s*\\=\\s*'));
    swaggerConsumes.shift();
    for (let idx = 0; idx < swaggerConsumes.length; ++idx) {
        let cons = await utils.stack0SymbolRecognizer(swaggerConsumes[idx], '[', ']');

        try {
            // Handling syntax error
            if (cons) consumes = [...consumes, ...eval(`(${'[' + cons.toLowerCase() + ']'})`)];
        } catch (err) {
            console.error('Syntax error: ' + cons);
            console.error(err);
            return false;
        }
    }

    // avoid duplicates
    let cleanedConsumes = new Set();
    cleanedConsumes.add(...consumes);
    return [...cleanedConsumes];
}

/**
 * TODO: fill
 * @param {*} data
 * @param {*} objResponses
 */
async function getResponsesTag(data, objResponses) {
    data = data.replaceAll('\n', ' ');
    let swaggerResponses = data.split(new RegExp('#swagger.responses'));
    swaggerResponses.shift();
    for (let idx = 0; idx < swaggerResponses.length; ++idx) {
        let statusCode = swaggerResponses[idx].split(new RegExp('\\[|\\]'))[1].replaceAll('"', '').replaceAll("'", '').replaceAll('`', '');

        if (swaggerResponses[idx].split(new RegExp(`\\[\\s*\\t*\\s*\\t*${statusCode}\\s*\\t*\\s*\\t*\\]\\s*\\t*\\s*\\t*\\=\\s*\\t*\\s*\\t*\\{`)).length > 1) {
            // has object
            let objResp = await utils.stack0SymbolRecognizer(swaggerResponses[idx], '{', '}');

            try {
                // Handling syntax error
                objResp = {
                    ...eval(`(${'{' + objResp + '}'})`)
                };
            } catch (err) {
                console.error('Syntax error: ' + objResp);
                console.error(err);
                return false;
            }

            if (objResp && objResp.schema && !objResp.schema.$ref) {
                objResponses[statusCode] = {
                    ...objResponses[statusCode],
                    ...objResp,
                    schema: formatDefinitions(objResp.schema)
                };
                if (objResponses[statusCode].xmlName) {
                    objResponses[statusCode].schema['xml'] = {
                        name: objResponses[statusCode].xmlName
                    };
                    delete objResponses[statusCode].xmlName;
                } else
                    objResponses[statusCode].schema['xml'] = {
                        name: 'main'
                    };
            } else
                objResponses[statusCode] = {
                    ...objResponses[statusCode],
                    ...objResp
                };
        } else {
            // There isn't any object
            objResponses[statusCode] = {};
        }

        if (!objResponses[statusCode].description) {
            objResponses[statusCode].description = tables.getHttpStatusDescription(statusCode, lang);
        }

        if (idx == swaggerResponses.length - 1) {
            return objResponses;
        }
    }
}

/**
 * TODO: fill
 * @param {*} data
 */
function popString(data) {
    let dataAux = data.split('');
    for (let idx = 0; idx < dataAux.length; ++idx) {
        if (dataAux[idx] == '"' || dataAux[idx] == "'" || dataAux[idx] == '`') {
            data = data.slice(idx);
            break;
        }
    }
    const quotMark = data[0];
    if ((quotMark == '"' || quotMark == "'" || quotMark == '`') && data.split(quotMark).length > 2) {
        let aux = data.replaceAll(`\\${quotMark}`, statics.STRING_BREAKER + 'quotMark' + statics.STRING_BREAKER);
        aux = aux.split(quotMark);
        data = aux[1];
        data = data.replaceAll(statics.STRING_BREAKER + 'quotMark' + statics.STRING_BREAKER, `\\${quotMark}`);
        if (data === '') {
            return null;
        }
        return data;
    }
    return null;
}

/**
 * TODO: fill
 * @param {*} data
 */
function getDescription(data) {
    let swaggerDescription = data.split(new RegExp('#swagger.description\\s*\\=\\s*'))[1];
    const quotMark = swaggerDescription[0];
    if ((quotMark == '"' || quotMark == "'" || quotMark == '`') && swaggerDescription.split(quotMark).length > 2) {
        let aux = swaggerDescription.replaceAll(`\\${quotMark}`, statics.STRING_BREAKER + 'quotMark' + statics.STRING_BREAKER);
        aux = aux.split(quotMark);
        swaggerDescription = aux[1];
        swaggerDescription = swaggerDescription.replaceAll(statics.STRING_BREAKER + 'quotMark' + statics.STRING_BREAKER, `\\${quotMark}`);
        return swaggerDescription;
    }
    return '';
}

/**
 * TODO: fill
 * @param {*} data
 */
function getSummary(data) {
    let swaggerSummary = data.split(new RegExp('#swagger.summary\\s*\\=\\s*'))[1];
    const quotMark = swaggerSummary[0];
    if ((quotMark == '"' || quotMark == "'" || quotMark == '`') && swaggerSummary.split(quotMark).length > 2) {
        let aux = swaggerSummary.replaceAll(`\\${quotMark}`, statics.STRING_BREAKER + 'quotMark' + statics.STRING_BREAKER);
        aux = aux.split(quotMark);
        swaggerSummary = aux[1];
        swaggerSummary = swaggerSummary.replaceAll(statics.STRING_BREAKER + 'quotMark' + statics.STRING_BREAKER, `\\${quotMark}`);
        return swaggerSummary;
    }
    return '';
}

/**
 * TODO: fill
 * @param {*} data
 */
function getOperationId(data) {
    let swaggerOperationId = data.split(new RegExp('#swagger.operationId\\s*\\=\\s*'))[1];
    const quotMark = swaggerOperationId[0];
    if ((quotMark == '"' || quotMark == "'" || quotMark == '`') && swaggerOperationId.split(quotMark).length > 2) {
        let aux = swaggerOperationId.replaceAll(`\\${quotMark}`, statics.STRING_BREAKER + 'quotMark' + statics.STRING_BREAKER);
        aux = aux.split(quotMark);
        swaggerOperationId = aux[1];
        swaggerOperationId = swaggerOperationId.replaceAll(statics.STRING_BREAKER + 'quotMark' + statics.STRING_BREAKER, `\\${quotMark}`);
        return swaggerOperationId;
    }
    return '';
}

/**
 * TODO: fill
 * @param {*} data
 */
function getTags(data) {
    let tags = [];
    let swaggerTags = data.split(new RegExp('#swagger.tags\\s*\\=\\s*'))[1];
    const symbol = swaggerTags[0];
    if (symbol == '[' && swaggerTags.split(new RegExp('\\[|\\]')).length > 2) {
        let aux = swaggerTags.split(new RegExp('\\[|\\]'));
        swaggerTags = aux[1];
        for (let idx = 0; idx < 15; ++idx) {
            // max limit of tags = 15
            let str = popString(swaggerTags);
            if (!str) {
                break;
            }

            swaggerTags = swaggerTags.replace(str, '').replaceAll('""', '').replaceAll("''", '').replaceAll('``', '');
            tags.push(str);
        }
        return tags;
    }
    return [];
}

/**
 * TODO: fill
 * @param {*} data
 */
async function getSecurityTag(data) {
    let security = [];
    let swaggerSecurity = data.split(new RegExp('#swagger.security\\s*\\=\\s*'))[1];
    let securityParameters = await utils.stack0SymbolRecognizer(swaggerSecurity, '[', ']');
    try {
        // Handling syntax error
        security = eval(`(${'[' + securityParameters + ']'})`);
    } catch (err) {
        console.error('Syntax error: ' + securityParameters);
        console.error(err);
        return false;
    }
    return security;
}

module.exports = {
    formatDefinitions,
    getLanguage,
    setLanguage,
    getPath,
    getMethodTag,
    getForcedEndpoints,
    getIgnoreTag,
    getAutoTag,
    getParametersTag,
    getProducesTag,
    getConsumesTag,
    getResponsesTag,
    getDescription,
    getTags,
    getSecurityTag,
    getSummary,
    getOperationId,
    getDeprecatedTag,
    getRequestBodyTag
};
