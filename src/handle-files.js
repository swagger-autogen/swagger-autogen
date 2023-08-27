const fs = require('fs');
const JSON5 = require('json5');
const merge = require('deepmerge');
const swaggerTags = require('./swagger-tags');
const handleData = require('./handle-data');
const statics = require('./statics');
const utils = require('./utils');
const codeParser = require('./code-parser');
const tables = require('./tables');

let globalOptions = {};
function setOptions(options) {
    globalOptions = options;
}

const overwriteMerge = (destinationArray, sourceArray, options) => {
    if (destinationArray || sourceArray || options) return sourceArray;
};

// ========================

// TODO: implement cache system to functions, e.g. sentToCache('/filePath', 'functionName') and always find in the cache. When it found, save in the cache. 
// Becaution about local function. Try to find localy and after in the cache and afer try to find in other file, maybe.


const recast = require('recast');
const tsParser = require("recast/parsers/typescript");


function getAstFromFile(filePath, props = {}) {
    return new Promise(resolve => {
        fs.readFile(filePath, 'utf8', async function (err, data) {
            if (err || !data || data.trim() === '') {
                return resolve(false);
            }

            const isTypeScript = /\.ts$/.test(filePath);

            try {
                const relativePath = filePath.includes('/') ? filePath.split('/').slice(0, -1).join('/') : filePath;
                const ast = recast.parse(data, {
                    parser: tsParser
                });

                console.log(ast);
                const properties = {
                    ...props,
                    astRoot: ast,
                    paths: {},
                    relativePath,
                    imports: new Set(),
                    isTypeScript,
                    filePath,
                    scopeStack: []
                };

                console.log()
                return resolve({ ast: ast.program, props: properties });

            } catch (err) {
                return resolve({});
            }
        });
    });
}

function processFile(filePath, props = {}) {
    return new Promise(resolve => {
        fs.readFile(filePath, 'utf8', async function (err, data) {
            if (err || !data || data.trim() === '') {
                return resolve(false);
            }

            const isTypeScript = /\.ts$/.test(filePath);

            try {
                const relativePath = filePath.includes('/') ? filePath.split('/').slice(0, -1).join('/') : filePath;
                const ast = recast.parse(data, {
                    parser: tsParser
                });

                console.log(ast);
                const response = await processAST(ast.program, {
                    astRoot: ast,
                    paths: {},
                    relativePath,
                    imports: new Set(),
                    isTypeScript,
                    filePath,
                    scopeStack: [],
                    ...props
                });
                response.imports = new Set();
                console.log()
                return resolve(response);

            } catch (err) {
                return resolve(false);
            }
        });
    });
}

async function processAST(ast, props) {

    // TODO: Handle case: const router = new Router({ prefix: '/api/v1' });

    let endpoint = {};

    if (ast.body) {
        for (let bodyIdx = 0; bodyIdx < ast.body.length; ++bodyIdx) {
            if (bodyIdx === 11) {
                console.log()
            }
            props.scopeStack.push(ast);
            const processedAst = await processAST(ast.body[bodyIdx], { ...props });
            props.scopeStack.pop();
            processedAst.imports.forEach(imp => props.imports.add(imp));
            props.paths = deepMerge(props.paths, processedAst.paths);
            props.inheritedProperties = processedAst.inheritedProperties;// ? processedAst.inheritedProperties : null;
            console.log()
        }
        return props;
    }

    if (ast.type === 'ExpressionStatement') {
        const processedAst = await processAST(ast.expression, { ...props });
        processedAst.imports.forEach(imp => props.imports.add(imp));
        props.paths = deepMerge(props.paths, processedAst.paths);
        return props;
    } else if (ast.type === 'MemberExpression') {
        if (ast?.object?.callee?.property?.type === 'Identifier' &&
            ast?.object?.callee?.property?.name === 'use') {

            console.log()
        }
        const processedAst = await processAST(ast.object, { ...props });
        processedAst.imports.forEach(imp => props.imports.add(imp));
        props.paths = deepMerge(props.paths, processedAst.paths);
        props.inheritedProperties = processedAst.inheritedProperties; // ? processedAst.inheritedProperties : null;
        return props;
    }

    props.imports = await findImports(ast, props);

    /**
     * Nodes
     */
    if (ast.type === 'CallExpression') {
        if (isMiddleware(ast)) {
            const handledMiddleware = await handleMiddleware(ast, { ...props });
            props.paths = deepMerge(props.paths, handledMiddleware.paths);
            props.inheritedProperties = handledMiddleware.inheritedProperties ? handledMiddleware.inheritedProperties : null;
            return props;
        } else if (isHttpRequestMethod(ast)) {
            if (!isValidNode(ast)) {
                return props;
            }

            if (ast.end === 2043) {
                console.log()
            }

            /**
             * Linked resquest methods
             * e.g. router.use(someMiddleware).get('/somePath', ...).post('/somePath', ...)
             */
            if (ast.callee?.object?.type === 'CallExpression') {
                if (ast.end === 146) {
                    console.log()
                }

                if (ast.callee?.object?.callee?.property?.type === 'Identifier' &&
                    ast.callee?.object?.callee?.property?.name === 'use') {
                    const callbackFunction = await findCallbackFunction(ast.callee?.object?.arguments[0], props);
                    props.inheritedProperties = callbackFunction;
                    console.log()
                }

                if (ast.end === 607) {
                    console.log()
                }
                props.isLinkedMethod = true;
                const processedAst = await processAST(ast.callee, { ...props });
                props.paths = deepMerge(props.paths, processedAst.paths);
                props.inheritedProperties = deepMerge(props.inheritedProperties || {}, processedAst.inheritedProperties || {});
                console.log()
            }

            if (ast.end === 607) {
                console.log()
            }

            let path = findPath(ast) || props.inheritedProperties?.path;
            const method = findMethod(ast);
            if (!path || !method) {
                return props;
            }

            if (props.routeProperties?.path) {
                path = props.routeProperties.path + path;
            }

            path = formatPath(path);

            if (path.includes('/me')) {
                console.log()
            }

            endpoint = createEndpoint(path, method, { ...endpoint });
            const pathParameters = findPathParameters(path);
            if (pathParameters.length > 0) {
                endpoint[path][method].parameters = [...pathParameters];
            }

            const handledParameters = await handleRequestMethodParameters(ast, { ...props, endpoint: endpoint[path][method] });

            if (path.includes('/me')) {
                console.log()
            }

            endpoint[path][method] = { ...endpoint[path][method], ...handledParameters };

            if (props.isLinkedMethod) {
                endpoint[path][method].responses = { ...props?.inheritedProperties?.responses, ...endpoint[path][method].responses }
            }

            endpoint[path][method] = deleteUnusedProperties({ ...endpoint[path][method] });


            console.log()
        } else if (isRoute(ast) && props.isLinkedMethod) {
            /**
             * Request method linked with route function
             * e.g. router.route('/path').get(someMiddleware, someCallback)
             */
            props.inheritedProperties = {
                path: findPath(ast)
            };

            console.log()
        } else {
            // TODO: handle it 
            console.log()
        }
    }

    props.paths = deepMerge(props.paths, endpoint);
    return props;
}

function findPathParameters(path) {
    if (!path) {
        return path;
    }

    let pathParameters = [];
    try {
        path.split('/{').slice(1).forEach(subPath => {
            // TODO: handle paths that use regex

            let parameterName = subPath.split('}')[0];
            pathParameters.push()
            if (swaggerTags.getOpenAPI()) {
                // Checks if the parameter name already exists
                pathParameters.push({
                    name: parameterName,
                    in: 'path',
                    required: true,
                    schema: {
                        type: 'string'
                    }
                })
            } else {
                pathParameters.push({
                    name: parameterName,
                    in: 'path',
                    required: true,
                    type: 'string'
                });
            }
        });
    } catch (err) {
        return [];
    }

    return pathParameters;
}

function formatPath(path) {
    if (!path) {
        return path;
    }

    let formattedPath;
    try {
        formattedPath = path.split('/').map(subPath => {
            // TODO: handle paths that use regex

            if (/^:/.test(subPath)) {
                subPath = '{' + subPath.replace(':', '') + '}';
            }
            return subPath;
        }).join('/');
    } catch (err) {
        return path;
    }

    return formattedPath;
}

function deleteUnusedProperties(endpoint) {
    let sanitizedEntpoint = {}
    try {
        Object.entries(endpoint).forEach(property => {
            const key = property[0];
            const value = property[1];

            if (value && Array.isArray(value) && value.length == 0) {
                return;
            } else if (value !== undefined) {
                sanitizedEntpoint[key] = value;
            }
            console.log()
        })

    } catch (err) {
        return endpoint;
    }
    return sanitizedEntpoint;

}

function createEndpoint(path, method, endpoint) {
    endpoint[path] = {}
    endpoint[path][method] = {
        tags: undefined,
        summary: undefined,
        description: '',
        operationId: undefined,
        consumes: undefined,
        produces: undefined,
        parameters: [],
        responses: undefined,
        security: undefined
    };

    return endpoint;
}

/**
 * Handling request method parameters
 * e.g. app.get(..., someCallback(...), (req, res) => {...})
 */
async function handleRequestMethodParameters(ast, props) {
    let requestBody = {};
    let comments = '';
    let endpoint = {
        parameters: [...props.endpoint.parameters],
        responses: {
            default: {
                description: ''
            }
        },
    };

    const nodes = ast.arguments;
    const numArgs = ast.arguments.length;
    const start = props.inheritedProperties?.path && props.isLinkedMethod ? 0 : 1;
    for (let idxArgs = start; idxArgs < numArgs; ++idxArgs) {
        const node = nodes[idxArgs];
        const callbackFunction = await findCallbackFunction(node, props);    // TODO: change these names?
        endpoint.parameters = [...endpoint.parameters, ...callbackFunction.queryParameters];
        if (callbackFunction.produces?.length > 0) {
            endpoint.produces = [...new Set([...(endpoint.produces || []), ...callbackFunction.produces])];
        }
        requestBody = { ...requestBody, ...callbackFunction.requestBody };
        if (callbackFunction.responses && endpoint.responses.default) {
            delete endpoint.responses.default;
        }
        endpoint.responses = { ...endpoint.responses, ...callbackFunction.responses };
        comments += callbackFunction.comments;
        console.log()
    }

    // Eliminate duplicated objects
    endpoint.parameters = endpoint.parameters.filter((value, index, self) =>
        index === self.findIndex((p) => (
            p.name === value.name && p.in === value.in
        ))
    )

    if (ast.end === 798) {
        console.log()
    }

    if (/#swagger\s*\./.test(comments)) {
        const handledComments = handleComments(comments, props);
        if (handledComments.responses && endpoint.responses.default) {
            delete endpoint.responses.default;
        }
        endpoint = deepMerge({ ...endpoint }, { ...handledComments })
        console.log()
    }

    if (Object.keys(requestBody).length > 0) {
        if (swaggerTags.getOpenAPI()) { // TODO: improve this. put in a better place
            // TODO: handle it
            console.log()
        } else {
            // Swagger 2.0
            const idxParameter = endpoint.parameters.findIndex(p => p.in?.toLowerCase() === 'body');

            let parameter = {
                name: 'body',
                in: 'body',
                description: '',
                schema: {
                    type: 'object',
                    properties: { ...requestBody }
                },
                ...endpoint.parameters[idxParameter] || {}
            };

            parameter = sanitizeParameter({ ...parameter })

            /**
             * Format schema put directly.
             * e.g. schema: { $name: "Jhon Doe", age: 29 }
             */
            if (Object.keys(parameter.schema).length > 1 && !parameter.schema.properties) {
                parameter.schema = swaggerTags.formatDefinitions(parameter.schema);
            }
            endpoint.parameters.push(parameter);

            if (idxParameter > -1) {
                endpoint.parameters.splice(idxParameter, 1)
            }

            console.log()
        }
    }

    console.log()
    return endpoint;
}

async function findCallbackFunction(node, props) {
    let imports = [...props.imports];
    let callback = {
        produces: [],
        queryParameters: [],
        requestBody: {},
        responses: {},
        comments: ''
    };

    /**
     * Referenced callback function
     * e.g.: 
     * const someFunction = require(...)
     * app.get(..., someFunction(...), ...)
     */


    if (node.end === 672) {
        console.log()
    }

    if (node.type === 'Program') {
        for (let bodyIdx = 0; bodyIdx < node.body.length; ++bodyIdx) {
            let body = node.body[bodyIdx];

            if (!props.externalAst) {
                const processedAst = await findCallbackFunction(body, { ...props });
                console.log()
                if (!isObjectEmpty(processedAst)) {
                    console.log()
                    return processedAst;
                }
                console.log()
            } else if (isModuleExports(body)) {
                /**
                 * Searching for module.exports = ...
                 */
                const processedAst = await findCallbackFunction(body, { ...props, scopeStack: [node] });
                console.log()
                if (!isObjectEmpty(processedAst)) {
                    console.log()
                    return processedAst;
                }
                console.log()

            }

            console.log()
        }
    } else if (node.type === 'ExpressionStatement') {
        const processedAst = await findCallbackFunction(node.expression, { ...props });
        return processedAst;
    } else if (node.type === 'ObjectExpression') {
        for (let idxProperty = 0; idxProperty < node.properties.length; ++idxProperty) {
            const property = node.properties[idxProperty];
            if (property.key?.name === props.functionName) {
                const callback = await findCallbackFunction(property, { ...props });
                console.log()
                return { ...callback };
            }
            console.log()
        }
        console.log()
    } else if (node.type === 'AssignmentExpression') {
        if (node.left?.object?.name === 'module' && node.left?.object?.type === 'Identifier' &&
            node.left?.property?.name === 'exports' && node.left?.property?.type === 'Identifier') {

            if (node.end === 202) {
                console.log()
            }

            /**
             * Exported arrow function
             * e.g module.exports = (req, res, ...) => { ... }
             */
            const callbackFunction = await findCallbackFunction(node.right, props);

            if (node.end === 202) {
                console.log()
            }
            console.log()
            return callbackFunction;
        }

    } else if (isValidArrowFunctionExpression(node) ||
        isValidObjectMethod(node, props) ||
        isValidFunctionDeclaration(node, props)) {

        if (node.end === 4038) {
            console.log()
        }

        const functionParametersName = findFunctionParametersName(node);
        /**
         * Handling function's body
         */
        for (let idxBody = 0; idxBody < node.body.body.length; ++idxBody) {
            let bodyNode = node.body.body[idxBody];
            let attributes = findAttributes(bodyNode, functionParametersName)
            callback.requestBody = { ...callback.requestBody, ...attributes.body };
            callback.queryParameters = [...callback.queryParameters, ...attributes.query];
            callback.responses = { ...callback.responses, ...attributes.responses };
            callback.produces = [...callback.produces, ...findProduces(bodyNode, functionParametersName)];
            callback.comments += findComments(bodyNode);
            console.log()
        }

        console.log()
    } else if (node.type === 'Identifier') {
        if (node.end === 672) {
            console.log()
        }

        // TODO: put in a function. See numArgs > 1
        // TODO: find first in the same file. If not found, try to find in the imports
        for (let idxScope = 0; idxScope < props.scopeStack.length; ++idxScope) {
            const scope = props.scopeStack[idxScope];
            const callback = await findCallbackFunction(scope, { ...props, scopeStack: [], functionName: node.name, externalAst: false });
            if (!isObjectEmpty(callback)) {
                return { ...callback };
            }
            console.log()
        }

        let route = imports.find(imp => imp.variableName === node.name);
        if (route) {
            const externalAst = await getAstFromFile(route.path, { ...props })
            const callback = await findCallbackFunction(externalAst.ast, { ...externalAst.props, externalAst: true });
            console.log()
            return callback;
        } else {
            // TODO: handle it
            console.log()
        }
        console.log()
    } else if (node.type === 'MemberExpression') {

        if (node.end === 2032) {
            console.log()
        }
        let route = imports.find(imp => imp.variableName === node.object?.name);
        let functionName = null;

        if (node.property?.name) {
            functionName = node.property?.name;
        }
        if (route) {
            const externalAst = await getAstFromFile(route.path, { ...props })
            const callback = await findCallbackFunction(externalAst.ast, { ...externalAst.props, functionName, externalAst: true });
            console.log()
            return callback;
        }
        console.log()
    } else if (node.type === 'ObjectMethod') {
        for (let idxBody = 0; idxBody < node.body.length; ++idxBody) {
            const property = node.body[idxBody];
            callback = await findCallbackFunction(property, { ...props });
            console.log()
        }
        console.log()
    } else if (node.type === 'ObjectProperty') {
        const processedAst = await findCallbackFunction(node.value, { ...props });
        return processedAst;
    } else {
        // TODO: handle it
        console.log()
    }

    return { ...callback };
}

function isModuleExports(node) {
    if (node.type === 'ExpressionStatement') {
        let subNode = node.expression
        if (subNode.type === 'AssignmentExpression' &&
            subNode.left?.object?.name === 'module' &&
            subNode.left?.object?.type === 'Identifier' &&
            subNode.left?.property?.name === 'exports' &&
            subNode.left?.property?.type === 'Identifier') {
            return true;
        }
    }

    return false;
}

function isValidArrowFunctionExpression(node) {
    return node.type === 'ArrowFunctionExpression' && node.params?.length > 1;
}

function isValidObjectMethod(node, props) {
    if (node.type === 'ObjectMethod' && props.functionName && node.key?.name !== props.functionName) {
        return false;
    }

    return node.type === 'ObjectMethod' && node.params?.length > 1;
}

function isValidFunctionDeclaration(node, props) {
    if (node.type === 'FunctionDeclaration' && props.functionName && node.id?.name !== props.functionName) {
        return false;
    }

    return node.type === 'FunctionDeclaration' && node.params?.length > 1;
}

function isObjectEmpty(object) {
    if (!object) {
        return true;
    }

    const values = Object.values(object);
    for (let idxValue = 0; idxValue < values.length; ++idxValue) {
        let value = values[idxValue];
        let type = typeof value;
        if (type === 'string' && value !== '') {
            return false;
        } else if (type === 'object' && Array.isArray(value) && value.length > 0) {
            return false;
        } else if (type === 'object' && Object.keys(value).length > 0) {
            return false;
        }
    }

    return true;
}

function isValidNode(ast) {
    return !!(ast?.arguments?.length) || false;
}

function deepMerge(objA = {}, objB = {}) {
    // Merging parameters at level 0
    if (objA?.parameters?.length > 0 && objB?.parameters?.length > 0) {
        let mergedParameters = [...objA?.parameters];
        for (let idxObjB = 0; idxObjB < objB.parameters.length; ++idxObjB) {
            let objBParameter = objB.parameters[idxObjB];
            let parameterIndex = mergedParameters.findIndex(param => param.name === objBParameter.name);
            if (parameterIndex > -1) {
                let mergedParameter = deepMerge({ ...mergedParameters[parameterIndex] }, { ...objBParameter });
                mergedParameters[parameterIndex] = mergedParameter;
            } else {
                mergedParameters.push(objBParameter);
            }
            console.log()
        }
        objB.parameters = mergedParameters;
    }
    return merge(objA, objB, {
        arrayMerge: overwriteMerge  // Do not disable it. Cause bad performance
    });
}

function handleComments(comments, props) {
    let handleComments = {};

    try {
        if (comments.hasSwaggerProperty('tags')) {
            handleComments.tags = getTags(comments, props);
        }

        if (comments.hasSwaggerProperty('summary')) {
            handleComments.summary = getValueString('summary', comments);
        }

        if (comments.hasSwaggerProperty('description')) {
            handleComments.description = getValueString('description', comments);
        }

        if (comments.hasSwaggerProperty('operationId')) {
            handleComments.operationId = getValueString('operationId', comments);
        }

        if (comments.hasSwaggerProperty('parameters')) {
            handleComments.parameters = getParameters(comments, props);
        }

        if (comments.hasSwaggerProperty('responses')) {
            handleComments.responses = getResponses(comments, props);
        }

        if (comments.hasSwaggerProperty('autoBody')) {
            console.log()
        }

        if (comments.hasSwaggerProperty('autoQuery')) {
            console.log()
        }

        if (comments.hasSwaggerProperty('autoHeaders')) {
            console.log()
        }

        if (comments.hasSwaggerProperty('auto')) {
            console.log()
        }

        if (comments.hasSwaggerProperty('produces')) {
            console.log()
        }

        if (comments.hasSwaggerProperty('consumes')) {
            console.log()
        }

        if (comments.hasSwaggerProperty('security')) {
            console.log()
        }

        if (comments.hasSwaggerProperty('deprecated')) {
            console.log()
        }

        console.log()
    } catch (err) {
        if (true) { // TODO: put getDisableLogs()
            console.error(`[swagger-autogen]: File:'${props.filePath}'\nMethod: [${props.endpoint?.method?.toUpperCase() || ''}] -> '${props.endpoint?.path || ''}'`);
        }
    }

    return handleComments;
}

function getValueString(key, comments) {
    try {
        const rawDescription = comments.split(getSingleSwaggerPropertyRegex(key))[1];
        return utils.popString(rawDescription);
    } catch (err) {
        if (true) { // TODO: put getDisableLogs()
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.${key}' out of structure in:`);
        }
    }
}

function getResponses(comments, props) {
    let responses = {};
    try {
        const rawResponses = comments.split(getNonSingleSwaggerPropertyRegex('responses')).slice(1);
        for (let idxParameter = 0; idxParameter < rawResponses.length; ++idxParameter) {
            const rawResponse = rawResponses[idxParameter];
            let statusCode = rawResponse.split(']')[0].trim();
            let object = eval(`(${getBetweenSymbols(rawResponse, '{', '}')})`);

            if (object?.schema && !object.schema.$ref) {
                object.schema = swaggerTags.formatDefinitions(object.schema);  // TODO: change formatDefinitions function name
            }

            // Forcing convertion to OpenAPI 3.x
            if (swaggerTags.getOpenAPI()) {
                // objResponses[statusCode] = {
                //     ...objResponses[statusCode],
                //     content: {
                //         'application/json': {
                //             schema: objResponses[statusCode].schema
                //         },
                //         'application/xml': {
                //             schema: objResponses[statusCode].schema
                //         }
                //     }
                // };
                // delete objResponses[statusCode].schema;
                console.log()
            } else {
                responses[statusCode] = {
                    ...object
                };
                console.log()
            }

            console.log()
        }
        console.log()
        return responses;
    } catch (err) {
        if (true) { // TODO: put getDisableLogs()
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.responses' out of structure in:\nFile:'${props.filePath}'\nMethod: [${props.endpoint?.method?.toUpperCase()}] -> '${props.endpoint?.path}'`);
        }
    }
    return [];
}

function getBetweenSymbols(data, startSymbol, endSymbol, keepSymbol = true) {
    try {
        let stack = 0;
        let rec = 0;
        let strVect = [];

        if (!endSymbol && startSymbol === '[') {
            endSymbol = ']';
        } else if (!endSymbol && startSymbol === '{') {
            endSymbol = '}';
        } else if (!endSymbol && startSymbol === '(') {
            endSymbol = ')';
        }

        for (let idx = 0; idx < data.length; ++idx) {
            let c = data[idx];

            if (rec == 0 && c == startSymbol) rec = 1;
            if (c == startSymbol && rec == 1) stack += 1;
            if (c == endSymbol && rec == 1) stack -= 1;
            if (stack == 0 && rec == 1) rec = 2;

            if (rec == 1) strVect.push(c);

            if ((idx === data.length - 1 && rec == 1) || (idx === data.length - 1 && rec == 0)) return resolve(null);

            if (idx === data.length - 1 || rec == 2) {
                strVect = strVect.join('');
                if (keepSymbol) {
                    return startSymbol + strVect.slice(1) + endSymbol;
                }
                return strVect.slice(1);
            }
        }
    } catch (err) {
        if (keepSymbol) {
            return startSymbol + endSymbol;
        }
        return '';
    }
}

function getParameters(comments, props) {
    let parameters = [];
    try {
        const rawParameters = comments.split(getNonSingleSwaggerPropertyRegex('parameters')).slice(1);
        for (let idxParameter = 0; idxParameter < rawParameters.length; ++idxParameter) {
            const rawParameter = rawParameters[idxParameter];
            let parameterName = utils.popString(rawParameter.split(']')[0]).trim();
            let object = eval(`(${getBetweenSymbols(rawParameter, '{', '}')})`);

            object = sanitizeParameter({ ...object });

            parameters.push({
                name: parameterName,
                ...object
            });
            console.log()
        }
        console.log()
        return parameters;
    } catch (err) {
        if (true) { // TODO: put getDisableLogs()
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.parameters' out of structure in:\nFile:'${props.filePath}'\nMethod: [${props.endpoint?.method?.toUpperCase()}] -> '${props.endpoint?.path}'`);
        }
    }
    return [];
}

function getTags(comments, props) {
    try {
        const rawTag = comments.split(getSingleSwaggerPropertyRegex('tags'))[1].split(']')[0] + ']';
        let tags = eval(`(${rawTag})`);
        if (!Array.isArray(tags)) {
            throw new Error;
        }
        return tags;
    } catch (err) {
        if (true) { // TODO: put getDisableLogs()
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.tags' out of structure in:\nFile:'${props.filePath}'\nMethod: [${props.endpoint?.method?.toUpperCase()}] -> '${props.endpoint?.path}'`);
        }
    }
    return [];
}

String.prototype.hasSwaggerProperty = function (property) {
    const nonSingleProperties = ['responses', 'parameters'];

    if (nonSingleProperties.includes(property)) {
        const swaggerRegex = getNonSingleSwaggerPropertyRegex(property);
        return swaggerRegex.test(this);
    }
    const swaggerRegex = getSingleSwaggerPropertyRegex(property);
    return swaggerRegex.test(this);
}

function getSingleSwaggerPropertyRegex(property) {
    return new RegExp(`#swagger\\s*\\.\\s*${property}\\s*=\\s*`)
}

function getNonSingleSwaggerPropertyRegex(property) {
    return new RegExp(`#swagger\\s*\\.\\s*${property}\\s*\\[\\s*`)
}

function sanitizeParameter(object) {
    if (!object) {
        return object;
    }

    let sanitizedObject = object;

    try {
        if (sanitizedObject.in?.toLowerCase() === 'body' && sanitizedObject.type) {
            delete sanitizedObject.type;
        }

        if (sanitizedObject.description === '') {
            delete sanitizedObject.description;
        }
    } catch (err) {
        return object;
    }

    return sanitizedObject;
}

function findComments(node) {
    let allComments = ''
    if (node.comments) {
        for (let idxComment = 0; idxComment < node.comments.length; ++idxComment) {
            let comment = node.comments[idxComment];
            allComments += '\n' + comment.value;
        }
        console.log()
    }
    return allComments;
}

async function handleMiddleware(ast, props) {
    let imports = [...props.imports]; // Converting Set in Array
    let numArgs = ast.arguments.length || 0;

    /**
     * Case (e.g.): app.use(routes)
     */
    if (numArgs === 1) {
        const node = ast.arguments[0];
        if (node.type === 'Identifier') {
            // TODO: put in a function. See numArgs > 1
            // TODO: find first in the same file. If not found, try to find in the imports
            let route = imports.find(imp => imp.variableName === node.name);
            let functionName = null;
            if (route?.variableName?.includes('.')) {
                functionName = route?.variableName.split('.')[1];
            }
            if (route) {
                const processedFile = await processFile(route.path, { functionName, isSearchingFunction: props.isSearchingFunction });
                props.paths = deepMerge(props.paths, processedFile.paths);
                props.inheritedProperties = processedFile.inheritedProperties ? processedFile.inheritedProperties : null;
                console.log()
            }
            console.log()
        } else {
            // TODO: handle it
            console.log()
        }
        // const response = routeCall()
    } else if (numArgs > 1) {
        // TODO: handle it
        let routeProperties = {};
        /**
         * Getting route and middlware(s)
         * e.g. <...>.use('/v1', ...)
         */
        const argument = ast.arguments[0];
        if (argument.type === 'StringLiteral') {
            routeProperties.path = argument.value;
            console.log()
        } else {
            // TODO: handle it
            console.log()
        }

        for (let idxArg = 1; idxArg < numArgs; ++idxArg) {
            const argument = ast.arguments[idxArg];
            if (argument.type === 'Identifier') {
                let route = imports.find(imp => imp.variableName === argument.name);
                let functionName = null;
                if (route?.variableName?.includes('.')) {
                    functionName = route?.variableName.split('.')[1];
                }
                if (route) {
                    const processedFile = await processFile(route.path, { functionName, routeProperties });
                    props.paths = deepMerge(props.paths, processedFile.paths);
                    props.inheritedProperties = processedFile.inheritedProperties ? processedFile.inheritedProperties : null;
                    console.log()
                }
                console.log()
            } else {
                // TODO: handle it
                console.log()
            }
            console.log()
        }


        console.log()
    } else {
        // TODO: handle it
        console.log()
    }

    return props;
}


async function findImports(ast, props) {
    let imports = [];
    /**
     * Imports: require and import
     */
    if (ast.type === 'VariableDeclaration') {
        const numDeclarations = ast.declarations ? ast.declarations.length : 0
        if (numDeclarations === 1) {
            const node = ast.declarations[0];
            if (node.init.callee.name === 'require') {
                let variableName;
                if (node.id.name) {
                    variableName = node.id.name
                } else {
                    // TODO: handle it
                }

                let path;
                const numArgs = node.init.arguments ? node.init.arguments.length : 0
                if (numArgs === 1) {
                    if (node.init.arguments[0].type === 'StringLiteral') {
                        path = node.init.arguments[0].value;
                    } else {
                        // TODO: handle it
                    }
                } else {
                    // TODO: handle it
                }

                if (path.includes('./')) {
                    console.log()
                }
                path = await pathSolver(path, props.relativePath);

                imports.push({
                    variableName,
                    path
                })

            }
            console.log()
        } else {
            // TODO: handle it
        }

        console.log()
    }

    return new Set([...props.imports, ...imports]);;
}

function findPath(ast) {
    let path;

    /**
     * Finding endpoint's path
     * e.g. app.get('/somePath', ...)
     * TODO: put it in a function
     */
    if (ast?.arguments[0]?.type === 'StringLiteral') {
        path = ast.arguments[0].value;
    } else {
        // TODO: solve variable value
        console.log()
    }

    return path;
}

function findMethod(ast) {
    return ast?.callee?.property?.name;
}

function isHttpRequestMethod(ast) {
    return statics.METHODS.includes(ast?.callee?.property?.name);
}

function isMiddleware(ast) {
    return !!(ast?.callee?.property?.name === 'use');
}

function isRoute(ast) {
    return !!(ast?.callee?.property?.name === 'route');
}

function findProduces(node, functionParametersName) {
    let produces = [];

    if (node.end === 105) {
        console.log(node)
    }

    if (!swaggerTags.getOpenAPI()) {
        if (node.type === 'TryStatement') {
            const blockResponse = findProduces(node.block, functionParametersName);
            const handlerResponse = findProduces(node.handler, functionParametersName);
            produces = [...produces, ...blockResponse, ...handlerResponse];
            console.log()
        } else if (node.type === 'BlockStatement') {
            // TODO: handle it
            // responses = {...responses, ...response};
            console.log()
        } else if (node.type === 'CatchClause') {
            for (let idxBody = 0; idxBody < node.body.body.length; ++idxBody) {
                const bodyNode = node.body.body[idxBody];
                const response = findProduces(bodyNode, functionParametersName);
                produces = [...produces, ...response];
                console.log()
            }
        } else if (node.type === 'ReturnStatement') {
            const response = findProduces(node.argument, functionParametersName);
            produces = [...produces, ...response];
            console.log()
        } else if (node.type === 'ExpressionStatement') {
            const response = findProduces(node.expression, functionParametersName);
            produces = [...produces, ...response];
            console.log()
        }

        /**
         * Handling status code
         * e.g.: const foo = res.status(...).<...>
         */
        else if (node.type === 'CallExpression' &&
            node.callee?.object?.name == functionParametersName.response &&
            node.callee?.property?.name === 'setHeader' &&
            node.arguments[0]?.value?.toLowerCase() == 'content-type') { // TODO: handle other cases such as: 

            if (node.arguments[1]?.type === 'StringLiteral') {
                produces.push(node.arguments[1].value);
                console.log()

            } else {
                // TODO: handle it
                console.log()
            }

            console.log()

        }
    }

    return produces;
}



/**
 * Handling body parameters
 * e.g.: <...> = req.body.<...>
 */
function findBodyAttributes(node, functionParametersName) {
    let body = {};

    if (node.object?.object?.name === functionParametersName.request &&
        node.object?.property?.name === 'body' &&
        node.property?.type === 'Identifier') {

        body[node.property.name] = {
            example: 'any'
        };
        console.log()
    } else if (node.value?.object?.object?.name === functionParametersName.request &&
        node.value?.object?.property?.name === 'body' &&
        node.value?.property.type === 'Identifier') {

        body[node.value.property.name] = {
            example: 'any'
        };

        console.log()
    } else if (node.init?.object?.object?.name === functionParametersName.request &&
        node.init.object.property?.name === 'body') {

        if (node.init.property.type === 'Identifier') {  // Refact? Call the function?
            body[node.init.property.name] = {
                example: 'any'
            };
        }
        console.log()
    } else if (node.init?.object?.name === functionParametersName.request &&
        node.init.property?.name === 'body' &&
        node.id?.properties?.length > 0) {

        console.log()

        for (let idxProperty = 0; idxProperty < node.id.properties.length; ++idxProperty) {
            let property = node.id.properties[idxProperty];
            if (property.type === 'ObjectProperty') {
                if (property.key.type === 'Identifier') {  // Refact?  Call the function?
                    body[property.key.name] = {
                        example: 'any'
                    };
                }
                console.log()
            }
            console.log()
        }
    }

    return body;
}

function findQueryAttributes(node, functionParametersName) {
    let query = [];

    if (node.object?.object?.name === functionParametersName.request &&
        node.object?.property?.name === 'query' &&
        node.property?.type === 'Identifier') {

        query.push({
            name: node.property.name,
            in: 'query',
            type: 'string'
        });
        console.log()
    } else if (node.value?.object?.object?.name === functionParametersName.request &&
        node.value?.object?.property?.name === 'query' &&
        node.value?.property.type === 'Identifier') {

        query.push({
            name: node.value.property.name,
            in: 'query',
            type: 'string'
        });

        console.log()
    } else if (node.init?.object?.object?.name === functionParametersName.request &&
        node.init.object.property?.name === 'query') {

        if (node.init.property.type === 'Identifier') {  // Refact? Call the function?
            query.push({
                name: node.init.property.name,
                in: 'query',
                type: 'string'
            });
        }
        console.log()
    } else if (node.init?.object?.name === functionParametersName.request &&
        node.init.property?.name === 'query' &&
        node.id?.properties?.length > 0) {

        console.log()

        for (let idxProperty = 0; idxProperty < node.id.properties.length; ++idxProperty) {
            let property = node.id.properties[idxProperty];
            if (property.type === 'ObjectProperty') {
                if (property.key.type === 'Identifier') {  // Refact?  Call the function?
                    query.push({
                        name: property.key.name,
                        in: 'query',
                        type: 'string'
                    });
                }
                console.log()
            }
            console.log()
        }
    }

    return query;

}

/**
 * Handling status code
 * e.g.: const foo = res.status(...).<...>
 */
function findStatusCodeAttributes(node, functionParametersName) {
    let responses = {};

    if (node.object?.callee?.object?.name == functionParametersName.response &&
        node.object.callee.property?.name === 'status') { // TODO: handle other cases such as: 

        if (node.object.arguments[0].type === 'NumericLiteral') {
            const statusCode = node.object.arguments[0].extra.raw;
            if (swaggerTags.getOpenAPI()) { // TODO: improve this. put in a better place
                // TODO: handle it
                console.log()
            } else {
                // Swagger 2.0
                responses[statusCode] = {
                    description: tables.getStatusCodeDescription(statusCode, swaggerTags.getLanguage())
                };
                console.log()
            }

            console.log()
        } else {
            // TODO: handle it
            console.log()
        }
    } else if (node.object?.name == functionParametersName.response &&
        node.property?.name === 'json') { // TODO: handle other cases such as: 

        if (swaggerTags.getOpenAPI()) { // TODO: improve this. put in a better place
            // TODO: handle it
            console.log()
        } else {
            // Swagger 2.0
            let statusCode = 200;
            responses[statusCode] = {
                description: tables.getStatusCodeDescription(statusCode, swaggerTags.getLanguage())
            };
            console.log()
        }
        console.log()
    }

    return responses;
}

function findAttributes(node, functionParametersName) {
    let attributes = {
        body: {},
        query: [],
        responses: {}
    };
    try {
        if (node.end === 3270) {
            console.log(node)
        }

        if (node.type === 'TryStatement') {
            const blockResponse = findAttributes(node.block, functionParametersName);
            attributes.body = { ...attributes.body, ...blockResponse.body, ...findBodyAttributes(node, functionParametersName) };
            attributes.query = [...attributes.query, ...blockResponse.query, ...findQueryAttributes(node, functionParametersName)];
            attributes.responses = { ...attributes.responses, ...blockResponse.responses, ...findStatusCodeAttributes(node, functionParametersName) };

            const handlerResponse = findAttributes(node.handler, functionParametersName);
            attributes.body = { ...attributes.body, ...handlerResponse.body, ...findBodyAttributes(node, functionParametersName) };
            attributes.query = [...attributes.query, ...handlerResponse.query, ...findQueryAttributes(node, functionParametersName)];
            attributes.responses = { ...attributes.responses, ...handlerResponse.responses, ...findStatusCodeAttributes(node, functionParametersName) };

            console.log()
        } else if (node.type === 'MemberExpression') {
            console.log(node)

            attributes.body = { ...attributes.body, ...findBodyAttributes(node, functionParametersName) };
            attributes.query = [...attributes.query, ...findQueryAttributes(node, functionParametersName)];
            attributes.responses = { ...attributes.responses, ...findStatusCodeAttributes(node, functionParametersName) };

            let response = findAttributes(node.object, functionParametersName);
            attributes.body = { ...attributes.body, ...response.body };
            attributes.query = [...attributes.query, ...response.query];
            attributes.responses = { ...attributes.responses, ...response.responses };

            console.log()
        } else if (node.type === 'ObjectProperty') {

            attributes.body = { ...attributes.body, ...findBodyAttributes(node, functionParametersName) };
            attributes.query = [...attributes.query, ...findQueryAttributes(node, functionParametersName)];
            attributes.responses = { ...attributes.responses, ...findStatusCodeAttributes(node, functionParametersName) };

            console.log()
        } else if (node.type === 'ObjectExpression') {
            for (let idxProperty = 0; idxProperty < node.properties.length; ++idxProperty) {
                let response = findAttributes(node.properties[idxProperty], functionParametersName);
                attributes.body = { ...attributes.body, ...response.body };
                attributes.query = [...attributes.query, ...response.query];
                attributes.responses = { ...attributes.responses, ...response.responses };
                console.log()
            }
            console.log()
        } else if (node.type === 'CallExpression') {
            console.log(node.callee)
            let response = findAttributes(node.callee, functionParametersName);
            attributes.body = { ...attributes.body, ...response.body };
            attributes.query = [...attributes.query, ...response.query];
            attributes.responses = { ...attributes.responses, ...response.responses };
            // if (node.callee?.property?.name === 'then' && node.arguments?.length > 0) {     // TODO: search in arguments regardless of outcome?
            for (let idxArgument = 0; idxArgument < node.arguments?.length; ++idxArgument) {
                response = findAttributes(node.arguments[idxArgument], functionParametersName);
                attributes.body = { ...attributes.body, ...response.body };
                attributes.query = [...attributes.query, ...response.query];
                attributes.responses = { ...attributes.responses, ...response.responses };
                console.log()
            }
            console.log()
        } else if (node.type === 'ExpressionStatement') {
            const response = findAttributes(node.expression, functionParametersName);
            attributes.body = { ...attributes.body, ...response.body };
            attributes.query = [...attributes.query, ...response.query];
            attributes.responses = { ...attributes.responses, ...response.responses };
            console.log()
        } else if (node.type === 'Identifier') {
            console.log()
        } else if (node.type === 'VariableDeclarator') {

            attributes.body = { ...attributes.body, ...findBodyAttributes(node, functionParametersName) };
            attributes.query = [...attributes.query, ...findQueryAttributes(node, functionParametersName)];
            attributes.responses = { ...attributes.responses, ...findStatusCodeAttributes(node, functionParametersName) };

            const response = findAttributes(node.init, functionParametersName);
            attributes.body = { ...attributes.body, ...response.body };
            attributes.query = [...attributes.query, ...response.query];
        } else if (node.type === 'VariableDeclaration') {
            for (let idxDeclaration = 0; idxDeclaration < node.declarations?.length; ++idxDeclaration) {
                const declaration = node.declarations[idxDeclaration];
                if (declaration.end === 2562) {
                    console.log()
                }

                const response = findAttributes(declaration, functionParametersName);
                // requestBody = deepMerge(response, requestBody);
                attributes.body = { ...attributes.body, ...response.body };
                attributes.query = [...attributes.query, ...response.query];
                attributes.responses = { ...attributes.responses, ...response.responses };
                console.log()

            }
        } else if (node.type === 'ReturnStatement') {
            const response = findAttributes(node.argument, functionParametersName);
            // requestBody = deepMerge(response, requestBody);
            attributes.body = { ...attributes.body, ...response.body };
            attributes.query = [...attributes.query, ...response.query];
            attributes.responses = { ...attributes.responses, ...response.responses };
            console.log()
        } else if (node.type === 'BlockStatement') {
            for (let idxBody = 0; idxBody < node.body.length; ++idxBody) {
                const bodyNode = node.body[idxBody];
                const response = findAttributes(bodyNode, functionParametersName);
                // requestBody = deepMerge(response, requestBody);
                attributes.body = { ...attributes.body, ...response.body };
                attributes.query = [...attributes.query, ...response.query];
                attributes.responses = { ...attributes.responses, ...response.responses };
                console.log()
            }
            console.log()
        } else if (['CatchClause', 'ArrowFunctionExpression'].includes(node.type)) {
            const response = findAttributes(node.body, functionParametersName);
            // requestBody = deepMerge(response, requestBody);
            attributes.body = { ...attributes.body, ...response.body };
            attributes.query = [...attributes.query, ...response.query];
            attributes.responses = { ...attributes.responses, ...response.responses };
            console.log()
        }

        return attributes;
    } catch (err) {
        return {};
    }
}

function findFunctionParametersName(node) {
    /**
     * Finding function parameters name
     */
    const functionParametersName = {
        request: null,
        response: null
    }

    /**
     * Request parameter name
     */
    if (node?.params[0]?.type === 'Identifier') {
        functionParametersName.request = node.params[0].name;
    } else {
        // TODO: handle it
    }

    /**
     * Response parameter name
     */
    if (node?.params[1]?.type === 'Identifier') {
        functionParametersName.response = node.params[1].name;
    } else {
        // TODO: handle it
    }

    return functionParametersName;
}

async function pathSolver(path, relativePath) {
    let solvedPath = path;
    if (path && path.includes('./')) {
        if (path.includes('../')) {
            let foldersToBack = path.split('../').length - 1;
            let RelativePathBacked = relativePath.split('/');
            RelativePathBacked = RelativePathBacked.slice(0, -1 * foldersToBack);
            RelativePathBacked = RelativePathBacked.join('/');

            // TODO: put in a function
            solvedPath = RelativePathBacked + '/' + path.trim().replaceAll('../', '/');
            solvedPath = solvedPath.replaceAll('//', '/');
            solvedPath = solvedPath.replaceAll('\\\\', '\\');
            const extension = await utils.getExtension(solvedPath);
            if (extension === '' && (await utils.getExtension('.' + solvedPath)) !== '') {
                solvedPath = '.' + solvedPath;
            }
            solvedPath = solvedPath + extension;
        } else {
            solvedPath = relativePath + path.trim().replaceAll('./', '/');
            solvedPath = solvedPath.replaceAll('//', '/');
            solvedPath = solvedPath.replaceAll('\\\\', '\\');
            const extension = await utils.getExtension(solvedPath);
            if (extension === '' && (await utils.getExtension('.' + solvedPath)) !== '') {
                solvedPath = '.' + solvedPath;
            }
            solvedPath = solvedPath + extension;
        }
    }
    return solvedPath;
}


module.exports = {
    setOptions,
    processFile
};
