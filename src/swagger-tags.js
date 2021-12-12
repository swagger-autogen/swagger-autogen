const tables = require('./tables');
const statics = require('./statics');
const utils = require('./utils');

let lang = 'en';
let openapi = null;
let disableLogs = false;

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

function getOpenAPI() {
    return openapi;
}

function setOpenAPI(param) {
    openapi = param;
    return openapi;
}

function setDisableLogs(param) {
    disableLogs = param;
    return disableLogs;
}

function getDisableLogs() {
    return disableLogs;
}

/**
 * TODO: fill
 * @param {*} def
 * @param {*} resp
 */
function formatDefinitions(def, resp = {}, constainXML) {
    try {
        // Forcing convertion to OpenAPI 3.x
        if (def && def.$ref && getOpenAPI() && def.$ref.includes('#/definitions/')) {
            def.$ref = def.$ref.replaceAll('#/definitions/', '#/components/schemas/');
        }

        /**
         * Enum (OpenAPI v3)
         */
        if (def['@enum']) {
            let enumType = 'string';
            if (def['@enum'][0]) {
                enumType = typeof def['@enum'][0];
            }
            def.type = enumType;
            def.enum = def['@enum'];
            delete def['@enum'];
            return def;
        }

        if (def && def.$ref) {
            if (def.$ref.split('#/').length === 1) {
                console.error('[swagger-autogen]: Syntax error: ', def.$ref);
                return resp;
            }
            let param = def.$ref.split('/').slice(-1)[0].replaceAll(' ', '');
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
    } catch (err) {
        return {};
    }
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

    try {
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
    } catch (err) {
        return '/_undefined_path_0x' + elem.length.toString(16);
    }
}

/**
 * Get #swagger.method
 * @param {string} data
 * @returns
 */
function getMethodTag(data, reference) {
    try {
        if (data.includes(statics.SWAGGER_TAG + '.method')) {
            let method = data.split(new RegExp(statics.SWAGGER_TAG + '.method' + '\\s*\\=\\s*'))[1];
            method = popString(method);
            if (method && statics.METHODS.includes(method.toLowerCase())) {
                return method.toLowerCase();
            }
        }
        return false;
    } catch (err) {
        if (!getDisableLogs()) {
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.method' out of structure in '${reference.filePath}'`);
        }
        return false;
    }
}

/**
 * Get #swagger.start and #swagger.end
 * @param {*} aData
 */
function getForcedEndpoints(aData, reference) {
    try {
        let aForcedsEndpoints = aData.split(new RegExp(`.*${statics.SWAGGER_TAG}.start.*|.*${statics.SWAGGER_TAG}.end.*`, 'i'));
        if (aForcedsEndpoints.length > 1) {
            aForcedsEndpoints = aForcedsEndpoints.filter((_, idx) => idx % 2 != 0);
            aForcedsEndpoints = aForcedsEndpoints.map(e => {
                let method = e.split(new RegExp(`${statics.SWAGGER_TAG}\\.method\\s*\\=\\s*`));
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
    } catch (err) {
        if (!getDisableLogs()) {
            console.error(`[swagger-autogen]: '#swagger.start' ... '#swagger.end' out of structure in '${reference.filePath}'`);
        }
        return [];
    }
}

/**
 * Search for #swagger.ignore
 * @param {*} elem
 */
function getIgnoreTag(elem) {
    try {
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
    } catch (err) {
        return false;
    }
}

/**
 * Search for #swagger.auto = false   (by default is true)
 * @param {*} data
 */
function getAutoTag(data) {
    try {
        if (data.includes(statics.SWAGGER_TAG + '.auto')) {
            let auto = data.split(new RegExp(statics.SWAGGER_TAG + '.auto' + '\\s*\\=\\s*'))[1];
            auto = auto.split(new RegExp('\\s|\\n|\\t|\\;'))[0];
            if (auto && auto.toLowerCase() === 'false') {
                return false;
            }
        }
        return true;
    } catch (err) {
        return true;
    }
}

/**
 * Search for #swagger.deprecated = true   (by default is false)
 * @param {*} data
 */
function getDeprecatedTag(data, reference) {
    try {
        if (data.includes(statics.SWAGGER_TAG + '.deprecated')) {
            let deprecated = data.split(new RegExp(statics.SWAGGER_TAG + '.deprecated' + '\\s*\\=\\s*'))[1];
            deprecated = deprecated.split(new RegExp('\\s|\\n|\\t|\\;'))[0];
            if (deprecated && deprecated.toLowerCase() === 'true') {
                return true;
            }
        }
        return false;
    } catch (err) {
        if (!getDisableLogs()) {
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.deprecated' out of structure in '${reference.filePath}' ... ${reference.predefPattern}.${reference.method}('${reference.path}', ...)`);
        }
        return false;
    }
}

/**
 * Get the content in '#swagger.parameters'
 * @param {string} data file content
 * @param {object} objParameters
 */
async function getParametersTag(data, objParameters, reference) {
    const origObjParameters = objParameters;
    try {
        data = data.replaceAll('"', "'").replaceAll('`', "'").replaceAll('`', "'").replaceAll('\n', ' ').replaceAll('#definitions', '#/definitions');
        data = data.replaceAll("'@enum'", '@enum').replaceAll('"@enum"', '@enum').replaceAll('`@enum`', '@enum').replaceAll('@enum', '"@enum"');

        if (getOpenAPI() && data.includes('#/definitions')) {
            data = data.replaceAll('#/definitions', '#/components/schemas');
        }
        let swaggerParameters = data.split(new RegExp(`${statics.SWAGGER_TAG}.parameters`));
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
                console.error('[swagger-autogen]: Syntax error: ' + parameter);
                console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.parameters' out of structure in '${reference.filePath}' ... ${reference.predefPattern}.${reference.method}('${reference.path}', ...)`);
                return origObjParameters;
            }

            /**
             * Specification rules
             */
            if (objParameters[name].in && objParameters[name].in.toLowerCase() === 'path' && !objParameters[name].required) {
                objParameters[name].required = true;
            }

            if (!objParameters[name].in) {
                // by default: 'in' is 'query'
                objParameters[name].in = 'query';
            }

            if (!objParameters[name].type && !objParameters[name].schema && objParameters[name].in != 'body') {
                // by default: 'type' is 'string' when 'schema' is missing
                if (getOpenAPI()) {
                    objParameters[name].schema = { type: 'string' };
                } else {
                    objParameters[name].type = 'string';
                }
            }

            if (objParameters[name].type && objParameters[name].in && objParameters[name].in.toLowerCase() === 'body') {
                delete objParameters[name].type;
            }

            if (objParameters[name].required && typeof objParameters[name].required === 'string') {
                if (objParameters[name].required.toLowerCase() === 'true') {
                    objParameters[name].required = true;
                } else {
                    objParameters[name].required = false;
                }
            }

            if (objParameters[name].in && objParameters[name].in.toLowerCase() === 'body' && !objParameters[name].schema) {
                objParameters[name].schema = { __AUTO_GENERATE__: true };
            }

            if (objParameters[name] && objParameters[name]['@schema']) {
                objParameters[name].schema = objParameters[name]['@schema'];
                delete objParameters[name]['@schema'];
            } else if (objParameters[name].schema && objParameters[name] && objParameters[name].schema && !objParameters[name].schema.$ref) {
                if (objParameters[name].schema['@enum']) {
                    /**
                     * Enum (OpenAPI v3)
                     */
                    let enumType = 'string';
                    if (objParameters[name].schema['@enum'][0]) {
                        enumType = typeof objParameters[name].schema['@enum'][0];
                    }
                    objParameters[name].schema.type = enumType;
                    objParameters[name].schema.enum = objParameters[name].schema['@enum'];
                    delete objParameters[name].schema['@enum'];
                } else {
                    objParameters[name].schema = formatDefinitions(objParameters[name].schema);
                }
            }

            /**
             * Forcing convertion to OpenAPI 3.x
             */
            if (getOpenAPI()) {
                if (objParameters[name] && objParameters[name].type && !objParameters[name].schema) {
                    objParameters[name].schema = { type: objParameters[name].type };
                    delete objParameters[name].type;
                }
                if (objParameters[name] && objParameters[name].schema && !objParameters[name].schema.$ref) {
                    objParameters[name].schema = {
                        type: objParameters[name].type ? objParameters[name].type : 'string',
                        ...objParameters[name].schema
                    };
                    if (objParameters[name].type) {
                        delete objParameters[name].type;
                    }
                }
            }

            // prioritizes #swagger.parameters
            if (objParameters[`${name}__[__[__${objParameters[name].in}__]__]`]) {
                delete objParameters[`${name}__[__[__${objParameters[name].in}__]__]`];
            }
        }
        return objParameters;
    } catch (err) {
        if (!getDisableLogs()) {
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.parameters' out of structure in '${reference.filePath}' ... ${reference.predefPattern}.${reference.method}('${reference.path}', ...)`);
        }
        return origObjParameters;
    }
}

/**
 * Get the content in '#swagger.requestBody'
 * @param {string} data file content
 */
async function getRequestBodyTag(data, reference) {
    try {
        let requestBody = {};
        data = data.replaceAll('"', "'").replaceAll('`', "'").replaceAll('`', "'").replaceAll('\n', ' ');
        let swaggerRequestBody = data.split(new RegExp(`${statics.SWAGGER_TAG}.requestBody`));
        swaggerRequestBody.shift();
        for (let idx = 0; idx < swaggerRequestBody.length; ++idx) {
            let parameter = await utils.stack0SymbolRecognizer(swaggerRequestBody[idx], '{', '}');
            if (parameter) {
                parameter = parameter.replaceAll('__¬¬¬__', '"');

                /**
                 * Forcing convertion to OpenAPI 3.x
                 */
                if (parameter && getOpenAPI() && parameter.includes('#/definitions/')) {
                    parameter = parameter.replaceAll('#/definitions/', '#/components/schemas/');
                }
            }

            requestBody = {
                ...eval(`(${'{' + parameter + '}'})`)
            };
        }

        return requestBody;
    } catch (err) {
        if (!getDisableLogs()) {
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.requestBody' out of structure in '${reference.filePath}' ... ${reference.predefPattern}.${reference.method}('${reference.path}', ...)`);
        }
        return {};
    }
}

/**
 * TODO: fill
 * @param {*} data
 */
async function getProducesTag(data, reference) {
    try {
        data = data.replaceAll('\n', ' ').replaceAll('__¬¬¬__', '"');
        let produces = [];
        let swaggerProduces = data.split(new RegExp(`${statics.SWAGGER_TAG}.produces\\s*\\=\\s*`));
        swaggerProduces.shift();
        for (let idx = 0; idx < swaggerProduces.length; ++idx) {
            let prod = await utils.stack0SymbolRecognizer(swaggerProduces[idx], '[', ']');

            if (prod) {
                produces = [...produces, ...eval(`(${'[' + prod.toLowerCase() + ']'})`)];
            }
        }

        // avoid duplicates
        let cleanedProduces = new Set();
        cleanedProduces.add(...produces);
        return [...cleanedProduces];
    } catch (err) {
        if (!getDisableLogs()) {
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.produces' out of structure in '${reference.filePath}' ... ${reference.predefPattern}.${reference.method}('${reference.path}', ...)`);
        }
        return [];
    }
}

/**
 * TODO: fill
 * @param {*} data
 */
async function getConsumesTag(data, reference) {
    try {
        data = data.replaceAll('\n', ' ').replaceAll('__¬¬¬__', '"');
        let consumes = [];
        let swaggerConsumes = data.split(new RegExp(`${statics.SWAGGER_TAG}.consumes\\s*\\=\\s*`));
        swaggerConsumes.shift();
        for (let idx = 0; idx < swaggerConsumes.length; ++idx) {
            let cons = await utils.stack0SymbolRecognizer(swaggerConsumes[idx], '[', ']');
            if (cons) {
                consumes = [...consumes, ...eval(`(${'[' + cons.toLowerCase() + ']'})`)];
            }
        }

        // avoid duplicates
        let cleanedConsumes = new Set();
        cleanedConsumes.add(...consumes);
        return [...cleanedConsumes];
    } catch (err) {
        if (!getDisableLogs()) {
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.consumes' out of structure in '${reference.filePath}' ... ${reference.predefPattern}.${reference.method}('${reference.path}', ...)`);
        }
        return [];
    }
}

/**
 * TODO: fill
 * @param {*} data
 * @param {*} objResponses
 */
async function getResponsesTag(data, objResponses, reference) {
    const origObjResponses = objResponses;
    try {
        data = data.replaceAll('\n', ' ').replaceAll('#definitions', '#/definitions');
        let swaggerResponses = data.split(new RegExp(`${statics.SWAGGER_TAG}.responses`));
        swaggerResponses.shift();
        for (let idx = 0; idx < swaggerResponses.length; ++idx) {
            let statusCode = swaggerResponses[idx].split(new RegExp('\\[|\\]'))[1].replaceAll('"', '').replaceAll("'", '').replaceAll('`', '');

            if (swaggerResponses[idx].split(new RegExp(`\\[\\s*\\t*\\s*\\t*${statusCode}\\s*\\t*\\s*\\t*\\]\\s*\\t*\\s*\\t*\\=\\s*\\t*\\s*\\t*\\{`)).length > 1) {
                // has object
                let objResp = await utils.stack0SymbolRecognizer(swaggerResponses[idx], '{', '}');
                objResp = objResp.replaceAll('__¬¬¬__', '"');

                /**
                 * Forcing convertion to OpenAPI 3.x
                 */
                if (objResp && getOpenAPI() && objResp.includes('#/definitions/')) {
                    objResp = objResp.replaceAll('#/definitions/', '#/components/schemas/');
                }

                try {
                    objResp = {
                        ...eval(`(${'{' + objResp + '}'})`)
                    };
                } catch (err) {
                    console.error('[swagger-autogen]: Syntax error: ' + objResp);
                    console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.responses' out of structure in '${reference.filePath}' ... ${reference.predefPattern}.${reference.method}('${reference.path}', ...)`);
                    return origObjResponses;
                }

                if (objResp && objResp['@schema']) {
                    objResp.schema = objResp['@schema'];
                    delete objResp['@schema'];
                    objResponses[statusCode] = {
                        ...objResponses[statusCode],
                        ...objResp,
                        schema: objResp.schema
                    };
                } else if (objResp && objResp.schema && !objResp.schema.$ref) {
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

            // Forcing convertion to OpenAPI 3.x
            if (getOpenAPI() && objResponses[statusCode] && objResponses[statusCode].schema && !objResponses[statusCode].content) {
                objResponses[statusCode] = {
                    ...objResponses[statusCode],
                    content: {
                        'application/json': {
                            schema: objResponses[statusCode].schema
                        },
                        'application/xml': {
                            schema: objResponses[statusCode].schema
                        }
                    }
                };
                delete objResponses[statusCode].schema;
            }
            if (idx == swaggerResponses.length - 1) {
                return objResponses;
            }
        }
    } catch (err) {
        if (!getDisableLogs()) {
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.responses' out of structure in '${reference.filePath}' ... ${reference.predefPattern}.${reference.method}('${reference.path}', ...)`);
        }
        return origObjResponses;
    }
}

/**
 * TODO: fill
 * @param {*} data
 */
function popString(data) {
    try {
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
    } catch (err) {
        return null;
    }
}

/**
 * TODO: fill
 * @param {*} data
 */
function getDescription(data, reference) {
    try {
        let swaggerDescription = data.split(new RegExp(`${statics.SWAGGER_TAG}.description\\s*\\=\\s*`))[1];

        const quotMark = swaggerDescription[0];
        if ((quotMark == '"' || quotMark == "'" || quotMark == '`') && swaggerDescription.split(quotMark).length > 2) {
            let aux = swaggerDescription.replaceAll(`\\${quotMark}`, statics.STRING_BREAKER + 'quotMark' + statics.STRING_BREAKER);
            aux = aux.split(quotMark);
            swaggerDescription = aux[1];
            swaggerDescription = swaggerDescription.replaceAll(statics.STRING_BREAKER + 'quotMark' + statics.STRING_BREAKER, `\\${quotMark}`);
            return swaggerDescription;
        }
        return '';
    } catch (err) {
        if (!getDisableLogs()) {
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.description' out of structure in '${reference.filePath}' ... ${reference.predefPattern}.${reference.method}('${reference.path}', ...)`);
        }
        return '';
    }
}

/**
 * TODO: fill
 * @param {*} data
 */
function getSummary(data, reference) {
    try {
        let swaggerSummary = data.split(new RegExp(`${statics.SWAGGER_TAG}.summary\\s*\\=\\s*`))[1];
        const quotMark = swaggerSummary[0];
        if ((quotMark == '"' || quotMark == "'" || quotMark == '`') && swaggerSummary.split(quotMark).length > 2) {
            let aux = swaggerSummary.replaceAll(`\\${quotMark}`, statics.STRING_BREAKER + 'quotMark' + statics.STRING_BREAKER);
            aux = aux.split(quotMark);
            swaggerSummary = aux[1];
            swaggerSummary = swaggerSummary.replaceAll(statics.STRING_BREAKER + 'quotMark' + statics.STRING_BREAKER, `\\${quotMark}`);
            return swaggerSummary;
        }
        return '';
    } catch (err) {
        if (!getDisableLogs()) {
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.summary' out of structure in '${reference.filePath}' ... ${reference.predefPattern}.${reference.method}('${reference.path}', ...)`);
        }
        return '';
    }
}

/**
 * TODO: fill
 * @param {*} data
 */
function getOperationId(data, reference) {
    try {
        let swaggerOperationId = data.split(new RegExp(`${statics.SWAGGER_TAG}.operationId\\s*\\=\\s*`))[1];
        const quotMark = swaggerOperationId[0];
        if ((quotMark == '"' || quotMark == "'" || quotMark == '`') && swaggerOperationId.split(quotMark).length > 2) {
            let aux = swaggerOperationId.replaceAll(`\\${quotMark}`, statics.STRING_BREAKER + 'quotMark' + statics.STRING_BREAKER);
            aux = aux.split(quotMark);
            swaggerOperationId = aux[1];
            swaggerOperationId = swaggerOperationId.replaceAll(statics.STRING_BREAKER + 'quotMark' + statics.STRING_BREAKER, `\\${quotMark}`);
            return swaggerOperationId;
        }
        return '';
    } catch (err) {
        if (!getDisableLogs()) {
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.operationId' out of structure in '${reference.filePath}' ... ${reference.predefPattern}.${reference.method}('${reference.path}', ...)`);
        }
        return '';
    }
}

/**
 * TODO: fill
 * @param {*} data
 */
function getTags(data, reference) {
    try {
        let tags = [];
        let swaggerTags = data.split(new RegExp(`${statics.SWAGGER_TAG}.tags\\s*\\=\\s*`))[1];
        const symbol = swaggerTags[0];
        if (symbol == '[' && swaggerTags.split(new RegExp('\\[|\\]')).length > 2) {
            let aux = swaggerTags.split(new RegExp('\\[|\\]'));
            swaggerTags = aux[1];
            for (let idx = 0; idx < 100; ++idx) {
                // max limit of tags = 100
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
    } catch (err) {
        if (!getDisableLogs()) {
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.tags' out of structure in '${reference.filePath}' ... ${reference.predefPattern}.${reference.method}('${reference.path}', ...)`);
        }
        return [];
    }
}

/**
 * TODO: fill
 * @param {*} data
 */
async function getSecurityTag(data, reference) {
    try {
        let security = [];
        let swaggerSecurity = data.split(new RegExp(`${statics.SWAGGER_TAG}.security\\s*\\=\\s*`))[1];
        let securityParameters = await utils.stack0SymbolRecognizer(swaggerSecurity, '[', ']');

        security = eval(`(${'[' + securityParameters + ']'})`);
        return security;
    } catch (err) {
        if (!getDisableLogs()) {
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.security' out of structure in '${reference.filePath}' ... ${reference.predefPattern}.${reference.method}('${reference.path}', ...)`);
        }
        return [];
    }
}

module.exports = {
    formatDefinitions,
    getLanguage,
    getOpenAPI,
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
    getRequestBodyTag,
    setLanguage,
    setOpenAPI,
    getDisableLogs,
    setDisableLogs
};
