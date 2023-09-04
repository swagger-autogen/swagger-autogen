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
// TODO: create option (maybe  'contentResponseType') for default 'content' to responses. Default: ['json'], but it's possible add more value such as: ['json', 'xml', ...]
// TODO: create tag #swagger.contentType to generate responses with specific content type. e.g: #swagger.contentType = ['json', 'xml']
// TODO: check error messages
// TODO: Automaticaly recognise 'tags' based on path. e.g.: /api/users  -> tags = ['Users'] OR /v1/auth/.../ -> tags = ['Auth']
// TODO: implement dev property. e.g.: devMode: true. It'll log everything such as erros, debus, non handled parts (search for "handle it")

/* Deprecated stuffs:
    #swagger.start and #swagger.end
    xml as default
*/

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

                const properties = {
                    ...props,
                    astRoot: ast,
                    paths: {},
                    relativePath,
                    imports: new Set(),
                    isTypeScript,
                    filePath,
                    scopeStack: [],
                    inheritedProperties: []
                };

                var debug = null;
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

                const response = await processAST(ast.program, {
                    astRoot: ast,
                    paths: {},
                    relativePath,
                    imports: new Set(),
                    isTypeScript,
                    filePath,
                    scopeStack: [],
                    inheritedProperties: [],
                    ...props
                });
                response.imports = new Set();
                var debug = null;
                return resolve(response);

            } catch (err) {
                return resolve(false);
            }
        });
    });
}

async function processAndMergeAST(ast, props) {
    let newProps = { ...props };
    const processedAst = await processAST(ast, { ...props });
    processedAst.imports.forEach(imp => newProps.imports.add(imp));
    newProps.paths = deepMerge(newProps.paths, processedAst.paths);
    newProps.inheritedProperties = processedAst.inheritedProperties || [];

    return newProps;
}

function removeArrayElement(arr, n) {
    arr.splice(n, 1);
    return arr;
}

function applyNewRoutes(props) {

    /**
     * Case: router.use('/somePath', router);
     */
    const idxSelfRouted = props.inheritedProperties?.findIndex(p => p.isSelfRouted && p.path);
    if (idxSelfRouted > -1) {
        const selfRouted = props.inheritedProperties[idxSelfRouted];
        let auxPaths = {};

        Object.keys(props.paths).forEach(path => {
            let newRoutePath;
            if (props.routeProperties?.path) {
                let auxPath = path.replace(new RegExp(`^${props.routeProperties.path}`), props.routeProperties.path + selfRouted.path);
                newRoutePath = (auxPath).replaceAll('//', '/');
                auxPaths[newRoutePath] = props.paths[path];
                var debug = null;
            } else {
                newRoutePath = (selfRouted.path + path).replaceAll('//', '/');
                auxPaths[newRoutePath] = props.paths[path];
            }

        })

        props.paths = auxPaths;
        props.inheritedProperties = removeArrayElement(props.inheritedProperties, idxSelfRouted);
        var debug = null;
    }

    return props;

}

async function processAST(ast, props) {

    // TODO: Handle case: const router = new Router({ prefix: '/api/v1' });

    let endpoint = {};

    try {

        if (ast.type === 'Program') {
            for (let bodyIdx = 0; bodyIdx < ast.body.length; ++bodyIdx) {
                if (bodyIdx === 11) {
                    var debug = null;
                }
                props.scopeStack.unshift(ast);
                const processedAst = await processAST(ast.body[bodyIdx], { ...props });
                props.scopeStack.shift();
                processedAst.imports.forEach(imp => props.imports.add(imp));
                props.paths = deepMerge(props.paths, processedAst.paths);
                props.inheritedProperties = processedAst.inheritedProperties || [];
                var debug = null;
            }

            props = applyNewRoutes({ ...props });

            return props;
        } else if (ast.type === 'ExpressionStatement') {
            return await processAndMergeAST(ast.expression, props);
        } else if (ast.type === 'MemberExpression') {
            return await processAndMergeAST(ast.object, props);
        } else if (ast.type === 'AssignmentExpression') {
            if (isModuleExports(ast)) {
                return await processAndMergeAST(ast.right, props);
            }
            return props;
        } else if (ast.type === 'FunctionExpression') {
            return await processAndMergeAST(ast.body, props);
        } else if (ast.type === 'BlockStatement') {
            props.scopeStack.unshift(ast);
            for (let bodyIdx = 0; bodyIdx < ast.body.length; ++bodyIdx) {
                props = await processAndMergeAST(ast.body[bodyIdx], props);
            }
            props.scopeStack.shift();
            return props;
        }

        props.imports = await findImports(ast, props);

        /**
         * Nodes
         */
        if (ast.type === 'CallExpression') {
            if (ast.end === 2309) {
                var debug = null;
            }
            if (isMiddleware(ast)) {
                const handledMiddleware = await handleMiddleware(ast, { ...props });
                props.paths = deepMerge(props.paths, handledMiddleware.paths);
                props.inheritedProperties = handledMiddleware.inheritedProperties || [];
                return props;
            } else if (isHttpRequestMethod(ast)) {
                if (!isValidNode(ast)) {
                    return props;
                }

                if (ast.end === 2043) {
                    var debug = null;
                }

                /**
                 * Linked resquest methods
                 * e.g. router.use(someMiddleware).get('/somePath', ...).post('/somePath', ...)
                 */
                if (ast.callee?.object?.type === 'CallExpression') {
                    if (ast.end === 146) {
                        var debug = null;
                    }

                    if (ast.callee?.object?.callee?.property?.type === 'Identifier' &&
                        ast.callee?.object?.callee?.property?.name === 'use') {
                        const callbackFunction = await findCallbackFunction(ast.callee?.object?.arguments[0], props);
                        props.inheritedProperties.push({
                            path: null,
                            isLinkedMethod: true,
                            isMiddleware: false,
                            content: callbackFunction
                        });
                        var debug = null;
                    }

                    if (ast.end === 607) {
                        var debug = null;
                    }

                    props.isLinkedMethod = true;
                    const processedAst = await processAST(ast.callee, { ...props });
                    props.paths = deepMerge(props.paths, processedAst.paths);
                    props.inheritedProperties = processedAst.inheritedProperties || [];
                    var debug = null;
                }

                if (ast.end === 607) {
                    var debug = null;
                }

                let path = findPath(ast, props);
                let method = findMethod(ast);
                if (!path || !method) {
                    return props;
                }

                if (props.routeProperties?.path) {
                    path = props.routeProperties.path + path;
                }

                path = formatPath(path);

                if (path == '/signin') {
                    var debug = null;
                }

                endpoint = createEndpoint(path, method, { ...endpoint });
                const pathParameters = findPathParameters(path);
                if (pathParameters.length > 0) {
                    endpoint[path][method].parameters = [...pathParameters];
                }

                const handledParameters = await handleRequestMethodParameters(ast, { ...props, endpoint: endpoint[path][method] });

                if (path == '/signin') {
                    var debug = null;
                }

                if (handledParameters.ignore === true) {
                    return props;
                }

                if (handledParameters.auto === false) {
                    delete endpoint[path][method];
                    if (Object.keys(endpoint[path]).length == 0) {
                        delete endpoint[path];
                    }
                    path = handledParameters.path || path;
                    method = handledParameters.method || method;
                    endpoint = createEndpoint(path, method, { ...endpoint });
                    endpoint[path][method] = changeToManualAttributes({ ...handledParameters });
                } else {
                    endpoint[path][method] = { ...endpoint[path][method], ...handledParameters };
                }

                if (ast.end === 404) {
                    var debug = null;
                }

                if (props.isLinkedMethod) {
                    // TODO: inherit another properties such as: parameters, tags, descriptions, etc...
                    for (let idxInherit = 0; idxInherit < props.inheritedProperties.length; ++idxInherit) {
                        const inheritedProperty = props.inheritedProperties[idxInherit]
                        if (inheritedProperty.isLinkedMethod && inheritedProperty.content) {
                            endpoint[path][method].responses = { ...inheritedProperty.content.responses, ...endpoint[path][method].responses };
                        }
                    }
                }

                for (let idxInherit = 0; idxInherit < props.inheritedProperties.length; ++idxInherit) {
                    const inheritedProperty = props.inheritedProperties[idxInherit]
                    if (!inheritedProperty.isLinkedMethod && inheritedProperty.content) {
                        if ((!inheritedProperty.path || (new RegExp(`^${inheritedProperty.path}`).test(path))) ||
                            (!inheritedProperty.path || (props.routeProperties?.path && new RegExp(`^${props.routeProperties.path}${inheritedProperty.path}`).test(path)))
                        ) {
                            endpoint[path][method] = deepMerge(inheritedProperty.content, endpoint[path][method]);
                        }
                    }
                }


                endpoint[path][method] = deleteUnusedProperties({ ...buildEmptyEndpoint(), ...endpoint[path][method] });


                var debug = null;
            } else if (isRoute(ast) && props.isLinkedMethod) {
                /**
                 * Request method linked with route function
                 * e.g. router.route('/path').get(someMiddleware, someCallback)
                 */
                props.inheritedProperties.push({
                    path: findPath(ast),
                    isLinkedMethod: true,
                    isMiddleware: false,
                    content: null
                });

                var debug = null;
            } else {
                // TODO: handle it 
                var debug = null;
            }
        }

        props.paths = deepMerge(props.paths, endpoint);
        return props;
    } catch (err) {
        console.log()
        return props;
    }
}

function changeToManualAttributes(handledParameters) {
    delete handledParameters.auto;
    delete handledParameters.method;
    delete handledParameters.path;

    return { ...buildEmptyEndpoint(), ...handledParameters };
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
            pathParameters = buildPathParameter(parameterName, pathParameters);
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

    formattedPath = formattedPath.replaceAll('//', '/');
    formattedPath = formattedPath.replaceAll('\\\\', '\\');
    return formattedPath;
}

function isObjectEmpty(obj) {
    return Object.keys(obj).length === 0;
}

function deleteUnusedProperties(endpoint) {
    let sanitizedEntpoint = {}
    try {
        Object.entries(endpoint).forEach(property => {
            const key = property[0];
            const value = property[1];

            if (['comments'].includes(key)) {
                return;
            } else if (value && Array.isArray(value) && value.length == 0) {
                return;
            } else if (typeof value === 'object' && isObjectEmpty(value) && key !== 'description') {
                return;
            } else if (value !== undefined) {
                sanitizedEntpoint[key] = value;
            }
            var debug = null;
        })

    } catch (err) {
        return endpoint;
    }
    return sanitizedEntpoint;

}

function createEndpoint(path, method, endpoint) {
    endpoint[path] = {}
    endpoint[path][method] = buildEmptyEndpoint();

    return endpoint;
}

function buildEmptyEndpoint() {
    return {
        deprecated: undefined,
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
    const start = props.inheritedProperties.find(i => i.isLinkedMethod && i.path) ? 0 : 1;
    for (let idxArgs = start; idxArgs < numArgs; ++idxArgs) {
        const node = nodes[idxArgs];
        const callbackFunction = await findCallbackFunction(node, props);    // TODO: change these names?
        endpoint.parameters = [...endpoint.parameters, ...callbackFunction.queryParameters];
        if (callbackFunction.produces?.length > 0) {
            endpoint.produces = [...new Set([...(endpoint.produces || []), ...callbackFunction.produces])];
        }
        requestBody = { ...requestBody, ...callbackFunction.requestBody };
        if (Object.keys(callbackFunction.responses).length > 0 && endpoint.responses.default) {
            delete endpoint.responses.default;
        }
        endpoint.responses = { ...endpoint.responses, ...callbackFunction.responses };
        comments += callbackFunction.comments;
        var debug = null;
    }

    // Eliminate duplicated objects. // TODO: put in a function
    endpoint.parameters = endpoint.parameters.filter((value, index, self) =>
        index === self.findIndex((p) => (
            p.name === value.name && p.in === value.in
        ))
    )

    if (ast.end === 7890) {
        var debug = null;
    }

    if (/#swagger\s*\./.test(comments)) {
        const handledComments = handleComments(comments, props);
        if (handledComments.responses && endpoint.responses.default) {
            delete endpoint.responses.default;
        }

        if (handledComments.auto === false) {
            return handledComments;
        }
        endpoint = deepMerge({ ...endpoint }, { ...handledComments })
        var debug = null;
    }

    if (Object.keys(requestBody).length > 0) {
        if (swaggerTags.getOpenAPI()) { // TODO: improve this. put in a better place
            // TODO: handle it
            var debug = null;
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

            var debug = null;
        }
    }

    var debug = null;
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
        var debug = null;
    }

    if (node.type === 'Program') {
        for (let bodyIdx = 0; bodyIdx < node.body.length; ++bodyIdx) {
            let body = node.body[bodyIdx];

            if (!props.externalAst) {
                const processedAst = await findCallbackFunction(body, { ...props });
                if (!isObjectEmpty(processedAst)) {
                    return processedAst;
                }
                var debug = null;
            } else if (isModuleExports(body)) {
                /**
                 * Searching for module.exports = ...
                 */
                const processedAst = await findCallbackFunction(body, { ...props, scopeStack: [node] });
                if (!isObjectEmpty(processedAst)) {
                    return processedAst;
                }
                var debug = null;
            }

            var debug = null;
        }
    } else if (node.type === 'ExpressionStatement') {
        const processedAst = await findCallbackFunction(node.expression, { ...props });
        return processedAst;
    } else if (node.type === 'ObjectExpression') {
        for (let idxProperty = 0; idxProperty < node.properties.length; ++idxProperty) {
            const property = node.properties[idxProperty];
            if (property.key?.name === props.functionName) {
                const callback = await findCallbackFunction(property, { ...props });
                var debug = null;
                return { ...callback };
            }
            var debug = null;
        }
        var debug = null;
    } else if (node.type === 'AssignmentExpression') {
        if (node.left?.object?.name === 'module' && node.left?.object?.type === 'Identifier' &&
            node.left?.property?.name === 'exports' && node.left?.property?.type === 'Identifier') {

            if (node.end === 202) {
                var debug = null;
            }

            /**
             * Exported arrow function
             * e.g module.exports = (req, res, ...) => { ... }
             */
            const callbackFunction = await findCallbackFunction(node.right, props);

            if (node.end === 202) {
                var debug = null;
            }
            var debug = null;
            return callbackFunction;
        }

    } else if (isValidFunction(node, props)) {

        if (node.end === 4038) {
            var debug = null;
        }

        const functionParametersName = findFunctionParametersName(node);

        for (let idxComment = 0; idxComment < node.body.comments?.length; ++idxComment) {
            callback.comments += node.body.comments[idxComment].value;
        }
        /**
         * Handling body, query, produces and status code
         */
        for (let idxBody = 0; idxBody < node.body.body.length; ++idxBody) {
            let bodyNode = node.body.body[idxBody];
            let attributes = findAttributes(bodyNode, functionParametersName, { ...props, scopeStack: [node.body] })
            callback.requestBody = { ...callback.requestBody, ...attributes.body };
            callback.queryParameters = [...callback.queryParameters, ...attributes.query];
            callback.responses = { ...callback.responses, ...attributes.responses };
            callback.produces = [...callback.produces, ...attributes.produces];
            callback.comments += attributes.comments;
            var debug = null;
        }

        var debug = null;
    } else if (node.type === 'Identifier') {
        if (node.end === 672) {
            var debug = null;
        }

        // TODO: put in a function. See numArgs > 1
        // TODO: find first in the same file. If not found, try to find in the imports
        for (let idxScope = 0; idxScope < props.scopeStack.length; ++idxScope) {
            const scope = props.scopeStack[idxScope];
            const callback = await findCallbackFunction(scope, { ...props, scopeStack: [], functionName: node.name, externalAst: false });
            if (!isObjectEmpty(callback)) {
                return { ...callback };
            }
            var debug = null;
        }

        let route = imports.find(imp => imp.variableName === node.name);
        if (route) {
            const externalAst = await getAstFromFile(route.path, { ...props })
            const callback = await findCallbackFunction(externalAst.ast, { ...externalAst.props, externalAst: true });
            var debug = null;
            return callback;
        } else {
            // TODO: handle it
            var debug = null;
        }
        var debug = null;
    } else if (node.type === 'MemberExpression') {

        if (node.end === 2032) {
            var debug = null;
        }

        let route = imports.find(imp => imp.variableName === node.object?.name);
        let functionName = null;

        if (node.property?.name) {
            functionName = node.property?.name;
        }
        if (route) {
            const externalAst = await getAstFromFile(route.path, { ...props })
            const callback = await findCallbackFunction(externalAst.ast, { ...externalAst.props, functionName, externalAst: true });
            var debug = null;
            return callback;
        }
        var debug = null;
    } else if (node.type === 'ObjectMethod') {
        for (let idxBody = 0; idxBody < node.body.length; ++idxBody) {
            const property = node.body[idxBody];
            callback = await findCallbackFunction(property, { ...props });
            var debug = null;
        }
        var debug = null;
    } else if (node.type === 'ObjectProperty') {
        const processedAst = await findCallbackFunction(node.value, { ...props });
        return processedAst;
    } else if (node.type === 'ArrayExpression') {
        for (let idxElement = 0; idxElement < node.elements.length; ++idxElement) {
            const element = node.elements[idxElement];
            callback = await findCallbackFunction(element, { ...props });
            var debug = null;
        }
        var debug = null;
    } else {
        // TODO: handle it
        var debug = null;
    }

    return { ...callback };
}

function isModuleExports(node) {
    let auxNode = { ...node };
    if (node.type === 'ExpressionStatement') {
        auxNode = { ...node.expression };
    }

    if (auxNode.type === 'AssignmentExpression') {
        if (auxNode.type === 'AssignmentExpression' &&
            auxNode.left?.object?.name === 'module' &&
            auxNode.left?.object?.type === 'Identifier' &&
            auxNode.left?.property?.name === 'exports' &&
            auxNode.left?.property?.type === 'Identifier') {
            return true;
        }
    }

    return false;
}

function isValidFunction(node, props) {
    if (isValidArrowFunctionExpression(node) ||
        isValidObjectMethod(node, props) ||
        isValidFunctionDeclaration(node, props) ||
        isValidFunctionExpression(node, props)
    ) {
        return true;
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

function isValidFunctionExpression(node, props) {
    return node.type === 'FunctionExpression' && node.params?.length > 1;
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
            var debug = null;
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

        if (comments.hasSwaggerProperty('auto')) {
            handleComments.auto = getValueBoolean('auto', comments);
        }

        if (comments.hasSwaggerProperty('autoBody')) {
            var debug = null;
        }

        if (comments.hasSwaggerProperty('autoHeaders')) {
            var debug = null;
        }

        if (comments.hasSwaggerProperty('autoQuery')) {
            var debug = null;
        }

        if (comments.hasSwaggerProperty('consumes')) {
            handleComments.consumes = getValueArray('consumes', comments);
        }

        if (comments.hasSwaggerProperty('deprecated')) {
            handleComments.deprecated = getValueBoolean('deprecated', comments);
        }

        if (comments.hasSwaggerProperty('description')) {
            handleComments.description = getValueString('description', comments);
        }

        if (comments.hasSwaggerProperty('ignore')) {
            handleComments.ignore = getValueBoolean('ignore', comments);
        }

        if (comments.hasSwaggerProperty('method')) {
            handleComments.method = getValueString('method', comments);
        }

        if (comments.hasSwaggerProperty('operationId')) {
            handleComments.operationId = getValueString('operationId', comments);
        }

        if (comments.hasSwaggerProperty('parameters')) {
            handleComments.parameters = getParameters(comments, props);
        }

        if (comments.hasSwaggerProperty('path')) {
            handleComments.path = getValueString('path', comments);
        }

        if (comments.hasSwaggerProperty('produces')) {
            handleComments.produces = getValueArray('produces', comments);
        }

        if (comments.hasSwaggerProperty('responses')) {
            handleComments.responses = getResponses(comments, props);
        }

        if (comments.hasSwaggerProperty('security')) {
            handleComments.security = getValueArray('security', comments);
        }

        if (comments.hasSwaggerProperty('summary')) {
            handleComments.summary = getValueString('summary', comments);
        }

        if (comments.hasSwaggerProperty('tags')) {
            handleComments.tags = getTags(comments, props);
        }

        var debug = null;
    } catch (err) {
        if (true) { // TODO: put getDisableLogs()
            console.error(`[swagger-autogen]: File:'${props.filePath}'\nMethod: [${props.endpoint?.method?.toUpperCase() || ''}] -> '${props.endpoint?.path || ''}'`);
        }
    }

    return handleComments;
}

function getValueArray(key, comments) {
    try {
        const rawValue = comments.split(getSingleSwaggerPropertyRegex(key))[1];
        if (!rawValue || rawValue[0] !== '[') {
            throw new Error;
        }
        return eval(`(${getBetweenSymbols(rawValue, '[', ']')})`);;
    } catch (err) {
        if (true) { // TODO: put getDisableLogs()
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.${key}' out of structure in:`);
        }
    }
}

function getValueString(key, comments) {
    try {
        const rawValue = comments.split(getSingleSwaggerPropertyRegex(key))[1];
        return utils.popString(rawValue);
    } catch (err) {
        if (true) { // TODO: put getDisableLogs()
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.${key}' out of structure in:`);
        }
    }
}

function getValueBoolean(key, comments) {
    try {
        const rawValue = comments.split(getSingleSwaggerPropertyRegex(key))[1];
        return rawValue === 'true';
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

            if (hasSchema(object) && !object.schema?.$ref) {
                object.schema = swaggerTags.formatDefinitions(object.schema);  // TODO: change formatDefinitions function name
            }

            if (!object?.description) {
                object = {
                    description: tables.getStatusCodeDescription(statusCode, swaggerTags.getLanguage()),
                    ...object
                }
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
                var debug = null;
            } else {
                responses[statusCode] = {
                    ...object
                };
                var debug = null;
            }

            var debug = null;
        }
        var debug = null;
        return responses;
    } catch (err) {
        if (true) { // TODO: put getDisableLogs()
            console.error(`[swagger-autogen]: '${statics.SWAGGER_TAG}.responses' out of structure in:\nFile:'${props.filePath}'\nMethod: [${props.endpoint?.method?.toUpperCase()}] -> '${props.endpoint?.path}'`);
        }
    }
    return [];
}

function hasSchema(object) {
    if (!object) {
        return false;
    }
    return Object.keys(object).includes('schema')
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

            if ((idx === data.length - 1 && rec == 1) || (idx === data.length - 1 && rec == 0)) {
                return null;
            }

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

function createDefaultAtrributes(object) {
    if (object?.in === 'path') {
        if (!object.type) { // TODO: check case openApi 3
            object.type = "string"
        }
    }

    return object;
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
            object = createDefaultAtrributes({ ...object });

            parameters.push({
                name: parameterName,
                ...object
            });
            var debug = null;
        }
        var debug = null;
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
        var debug = null;
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
            // TODO: if in other file, check if it's a callback (to get parameters as a middleware) or .use to call sub-routes (export the express.Router())
            for (let idxScope = 0; idxScope < props.scopeStack.length; ++idxScope) {
                const scope = props.scopeStack[idxScope];
                const callback = await findCallbackFunction(scope, { ...props, scopeStack: [], functionName: node.name, externalAst: false });
                if (!isObjectEmpty(callback)) {
                    props.inheritedProperties.push({
                        path: null,
                        isLinkedMethod: false,
                        isMiddleware: true,
                        content: callback
                    });
                    return { ...props };
                }
                var debug = null;
            }

            let route = imports.find(imp => imp.variableName === node.name);
            let functionName = null;
            if (route) {
                // const filteredInheritedProperties = props.inheritedProperties.filter(i => i.isMiddleware);
                const processedFile = await processFile(route.path, { functionName, isSearchingFunction: props.isSearchingFunction, inheritedProperties: props.inheritedProperties });
                props.paths = deepMerge(props.paths, processedFile.paths);
                var debug = null;
            }
            var debug = null;
        } else if (node.type === 'FunctionExpression') {
            const callback = await findCallbackFunction(node, { ...props });
            if (!isObjectEmpty(callback)) {
                props.inheritedProperties.push({
                    path: null,
                    isLinkedMethod: false,
                    isMiddleware: true,
                    content: callback
                });
                return { ...props };
            }
            var debug = null;
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
            var debug = null;
        } else {
            // TODO: handle it
            var debug = null;
        }

        for (let idxArg = 1; idxArg < numArgs; ++idxArg) {
            const argument = ast.arguments[idxArg];
            if (argument.type === 'Identifier') {

                /**
                 * Case: router.use('/somePath', router);
                 */
                if (argument.name === ast.callee?.object?.name) {
                    props.inheritedProperties.push({
                        path: routeProperties.path,
                        isLinkedMethod: false,
                        isMiddleware: false,
                        isSelfRouted: true,
                        content: null
                    });
                    return props;
                }

                let route = imports.find(imp => imp.variableName === argument.name);
                let functionName = null;
                if (route?.variableName?.includes('.')) {
                    functionName = route?.variableName.split('.')[1];
                }
                if (route) {
                    const filteredInheritedProperties = props.inheritedProperties.filter(i => i.isMiddleware);
                    // const processedFile = await processFile(route.path, { functionName, isSearchingFunction: props.isSearchingFunction, inheritedProperties: props.inheritedProperties, routeProperties });
                    const processedFile = await processFile(route.path, { functionName, routeProperties, inheritedProperties: filteredInheritedProperties });
                    props.paths = deepMerge(props.paths, processedFile.paths);
                    var debug = null;
                }
                var debug = null;
            } else if (argument.type === 'FunctionExpression') {
                const callback = await findCallbackFunction(argument, { ...props });
                if (!isObjectEmpty(callback)) {
                    props.inheritedProperties.push({
                        path: routeProperties.path,
                        isLinkedMethod: false,
                        isMiddleware: true,
                        content: callback
                    });
                    return { ...props };
                }
                var debug = null;
            }
            var debug = null;
        }


        var debug = null;
    } else {
        // TODO: handle it
        var debug = null;
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
            if (node.init?.callee?.name === 'require') {
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
                    var debug = null;
                }
                path = await pathSolver(path, props.relativePath);

                imports.push({
                    variableName,
                    path
                });

            }
            var debug = null;
        } else {
            // handle it
            var debug = null;
        }

        var debug = null;
    } else if (ast.type === 'ImportDeclaration') {
        let variableName;
        if (ast.specifiers[0]?.local?.name) {
            variableName = ast.specifiers[0].local.name;
        } else {
            // TODO: handle it
        }

        let path;
        if (ast.source?.type === 'StringLiteral') {
            path = ast.source.value;
        } else {
            // TODO: handle it
        }

        if (path.includes('./')) {
            var debug = null;
        }
        path = await pathSolver(path, props.relativePath);

        imports.push({
            variableName,
            path
        });
        var debug = null;
    }

    return new Set([...props.imports, ...imports]);;
}

function findPath(ast, props) {
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
        var debug = null;
    }

    if (!path) {
        const found = props.inheritedProperties.findLast(p => p.isLinkedMethod === true && !p.isMiddleware && p.path);
        if (found) {
            path = found.path;
        }
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

function buildPathParameter(name, pathParameters) {
    let builtPathParameters = [...pathParameters];
    if (swaggerTags.getOpenAPI()) {
        builtPathParameters.push({
            name: name,
            in: 'path',
            required: true,
            schema: {
                type: 'string'
            }
        });
    } else {
        builtPathParameters.push({
            name: name,
            in: 'path',
            required: true,
            type: 'string'
        });
    }

    return builtPathParameters;
}

function buildBodyParamter(name, body) {
    let builtBody = { ...body };
    builtBody[name] = {
        example: 'any'
    };
    return builtBody;
}

function buildQueryParameter(name, query) {
    let buildQuery = [...query];
    buildQuery.push({
        name: name,
        in: 'query',
        type: 'string'
    });
    return buildQuery;
}

function buildResponsesParameter(statusCode, responses) {
    let builtResponses = { ...responses };
    builtResponses[statusCode] = {
        description: tables.getStatusCodeDescription(statusCode, swaggerTags.getLanguage())
    };
    return builtResponses;
}

/**
 * Handling body parameters
 * e.g.: <...> = req.body.<...>
 */
function findBodyAttributes(node, functionParametersName, props) {
    let body = {};

    if (node.object?.object?.name === functionParametersName.request &&
        node.object?.property?.name === 'body' &&
        node.property?.type === 'Identifier') {

        body = buildBodyParamter(node.property.name, body);
        var debug = null;
    } else if (node.value?.object?.object?.name === functionParametersName.request &&
        node.value?.object?.property?.name === 'body' &&
        node.value?.property.type === 'Identifier') {

        body = buildBodyParamter(node.value.property.name, body);
        var debug = null;
    } else if (node.init?.object?.object?.name === functionParametersName.request &&
        node.init.object.property?.name === 'body' &&
        node.init.property.type === 'Identifier') {

        body = buildBodyParamter(node.init.property.name, body);
        var debug = null;
    } else if (node.init?.object?.name === functionParametersName.request &&
        node.init.property?.name === 'body' &&
        node.id?.properties?.length > 0) {
        for (let idxProperty = 0; idxProperty < node.id.properties.length; ++idxProperty) {
            let property = node.id.properties[idxProperty];
            if (property.type === 'ObjectProperty' && property.key.type === 'Identifier') {
                body = buildBodyParamter(property.key.name, body);
                var debug = null;
            }
            var debug = null;
        }
    } else if (node.object?.type === 'Identifier' && node.property?.type === 'Identifier') {
        /**
         * Indirect body variable.
         * e.g: 
         * const foo1 = req.body
         * const foo2 = foo.someAtrribute
         */
        if (node.end === 592) {
            var debug = null;
        }

        for (let idxScope = 0; idxScope < props.scopeStack.length; ++idxScope) {
            let scope = props.scopeStack[idxScope];
            let solvedVariable = solveVariable(scope, node.object);

            if (solvedVariable?.init?.object?.name === functionParametersName.request &&
                solvedVariable.init.property?.name === 'body'
            ) {
                body = buildBodyParamter(node.property.name, body);
                var debug = null;
            }
            var debug = null;
        }
    }

    return body;
}

function solveVariable(node, identifier) {
    if (node.end === 536) {
        var debug = null;
    }

    if (node.type === 'BlockStatement') {
        for (let idxBody = node.body.length - 1; idxBody >= 0; --idxBody) {
            const bodyNode = node.body[idxBody];
            if (identifier.start > bodyNode.start) {
                let solved = solveVariable(bodyNode, identifier);
                if (solved?.init?.type === 'Identifier' && idxBody > 0) {
                    solved = solveVariable(node.body[idxBody - 1], solved.init);
                }
                if (solved) {
                    return solved;
                }
            }
        }
    } else if (node.type === 'VariableDeclaration') {
        for (let idxDeclaration = 0; idxDeclaration < node.declarations?.length; ++idxDeclaration) {
            const declaration = node.declarations[idxDeclaration];
            return solveVariable(declaration, identifier);
        }
        var debug = null;
    } else if (node.type === 'VariableDeclarator') {
        if (node.id.name === identifier.name) {
            return node;
        }
        return solveVariable(node.init, identifier);
    }

    return null;
}


function findQueryAttributes(node, functionParametersName) {
    let query = [];

    if (node.object?.object?.name === functionParametersName.request &&
        node.object?.property?.name === 'query' &&
        node.property?.type === 'Identifier') {

        query = buildQueryParameter(node.property.name, query);
        var debug = null;
    } else if (node.value?.object?.object?.name === functionParametersName.request &&
        node.value?.object?.property?.name === 'query' &&
        node.value?.property.type === 'Identifier') {

        query = buildQueryParameter(node.value.property.name, query);
        var debug = null;
    } else if (node.init?.object?.object?.name === functionParametersName.request &&
        node.init.object.property?.name === 'query' &&
        node.init.property.type === 'Identifier') {
        query = buildQueryParameter(node.init.property.name, query);
        var debug = null;
    } else if (node.init?.object?.name === functionParametersName.request &&
        node.init.property?.name === 'query' &&
        node.id?.properties?.length > 0) {
        for (let idxProperty = 0; idxProperty < node.id.properties.length; ++idxProperty) {
            let property = node.id.properties[idxProperty];
            if (property.type === 'ObjectProperty' && property.key.type === 'Identifier') {
                query = buildQueryParameter(property.key.name, query);
                var debug = null;
            }
            var debug = null;
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

    if (node.end === 762) {
        var debug = null;
    }

    if (node.object?.callee?.object?.name == functionParametersName.response &&
        node.object.callee.property?.name === 'status') { // TODO: handle other cases such as: 
        const statusCodeList = findStatusCode(node.object.arguments[0]);
        for (let idxStatusCode = 0; idxStatusCode < statusCodeList.length; ++idxStatusCode) {
            const statusCode = statusCodeList[idxStatusCode];
            if (swaggerTags.getOpenAPI()) { // TODO: improve this. put in a better place
                // TODO: handle it
                var debug = null;
            } else {
                // Swagger 2.0
                responses = { ...responses, ...buildResponsesParameter(statusCode, responses) };
                var debug = null;
            }
        }
        var debug = null;
    } else if (node.object?.name === functionParametersName.response &&
        ['send', 'json'].includes(node.property?.name)) { // TODO: handle other cases such as: 

        if (swaggerTags.getOpenAPI()) { // TODO: improve this. put in a better place
            // TODO: handle it
            var debug = null;
        } else {
            // Swagger 2.0
            responses = buildResponsesParameter(200, responses);
            var debug = null;
        }
        var debug = null;
    } else if (node.callee?.object?.name === functionParametersName.response &&
        node.callee.property?.name === 'status') { // TODO: handle other cases such as: 
        const statusCodeList = findStatusCode(node.arguments[0]);
        for (let idxStatusCode = 0; idxStatusCode < statusCodeList.length; ++idxStatusCode) {
            const statusCode = statusCodeList[idxStatusCode];
            if (swaggerTags.getOpenAPI()) { // TODO: improve this. put in a better place
                // TODO: handle it
                var debug = null;
            } else {
                // Swagger 2.0
                responses = { ...responses, ...buildResponsesParameter(statusCode, responses) };
                var debug = null;
            }
        }
        var debug = null;
    }

    return responses;
}

function findStatusCode(node) {
    if (node?.type === 'NumericLiteral') {
        return [node.extra.raw];
    } else if (node?.type === 'LogicalExpression' && node?.operator === '||') {
        const left = findStatusCode(node.left);
        const right = findStatusCode(node.right);
        return [...left, ...right];
    } else if (node?.type === 'ConditionalExpression') {
        const consequent = findStatusCode(node.consequent);
        const alternate = findStatusCode(node.alternate);
        return [...consequent, ...alternate];
    }
    return [];
}

function findProducesAttributes(node, functionParametersName) {
    let produces = [];

    if (node.callee?.object?.name == functionParametersName.response &&
        node.callee?.property?.name === 'setHeader' &&
        node.arguments[0]?.value?.toLowerCase() == 'content-type') { // TODO: handle other cases such as: 

        if (node.arguments[1]?.type === 'StringLiteral') {
            produces.push(node.arguments[1].value.toLowerCase());
            var debug = null;

        } else {
            // TODO: handle it
            var debug = null;
        }

        var debug = null;
    }

    return produces;
}

function findAndMergeAttributes(node, functionParametersName, attributes, response, props) {
    let handled = {
        body: {},
        query: [],
        responses: {},
        produces: [],
        comments: ''
    }

    if (node.end === 560) {
        var debug = null;
    }

    if (!response) {
        response = { ...handled };
    }

    handled.body = { ...attributes.body, ...response.body, ...findBodyAttributes(node, functionParametersName, props) };
    handled.query = [...attributes.query, ...response.query, ...findQueryAttributes(node, functionParametersName)];
    handled.responses = { ...attributes.responses, ...response.responses, ...findStatusCodeAttributes(node, functionParametersName) };
    handled.produces = [...attributes.produces, ...response.produces, ...findProducesAttributes(node, functionParametersName)];
    handled.comments = attributes.comments + response.comments;

    return handled;
}

function mergeAttributes(attributes, response) {
    let handled = {
        body: {},
        query: [],
        responses: {},
        produces: [],
        comments: ''
    }

    handled.body = { ...attributes.body, ...response.body };
    handled.query = [...attributes.query, ...response.query];
    handled.responses = { ...attributes.responses, ...response.responses };
    handled.produces = [...attributes.produces, ...response.produces];
    handled.comments = attributes.comments + response.comments;

    return handled;
}

function findAttributes(node, functionParametersName, props) {
    let attributes = {
        body: {},
        query: [],
        responses: {},
        produces: [],
        comments: ''
    };
    try {
        if (node.end === 3789) {
            var debug = null;
        }

        attributes.comments = findComments(node);

        if (node.type === 'TryStatement') {
            const blockResponse = findAttributes(node.block, functionParametersName, props);
            attributes = findAndMergeAttributes(node, functionParametersName, { ...attributes }, blockResponse, props)
            const handlerResponse = findAttributes(node.handler, functionParametersName, props);
            attributes = findAndMergeAttributes(node, functionParametersName, { ...attributes }, handlerResponse, props)
            var debug = null;
        } else if (node.type === 'IfStatement') {
            const response = findAttributes(node.consequent, functionParametersName, props);
            attributes = mergeAttributes(attributes, response);
            var debug = null;
        } else if (node.type === 'MemberExpression') {
            attributes = findAndMergeAttributes(node, functionParametersName, { ...attributes }, null, props)
            let response = findAttributes(node.object, functionParametersName, props);
            attributes = mergeAttributes(attributes, response);
            var debug = null;
        } else if (node.type === 'ObjectProperty') {
            attributes = findAndMergeAttributes(node, functionParametersName, { ...attributes }, null, props)
            var debug = null;
        } else if (node.type === 'ObjectExpression') {
            for (let idxProperty = 0; idxProperty < node.properties.length; ++idxProperty) {
                let response = findAttributes(node.properties[idxProperty], functionParametersName, props);
                attributes = mergeAttributes(attributes, response);
                var debug = null;
            }
            var debug = null;
        } else if (node.type === 'CallExpression') {
            attributes = findAndMergeAttributes(node, functionParametersName, { ...attributes }, null, props)
            let response = findAttributes(node.callee, functionParametersName, props);
            attributes = mergeAttributes(attributes, response);

            for (let idxArgument = 0; idxArgument < node.arguments?.length; ++idxArgument) {
                response = findAttributes(node.arguments[idxArgument], functionParametersName, props);
                attributes = mergeAttributes(attributes, response);
                var debug = null;
            }
            var debug = null;
        } else if (node.type === 'ExpressionStatement') {
            const response = findAttributes(node.expression, functionParametersName, props);
            attributes = mergeAttributes(attributes, response);
            var debug = null;
        } else if (node.type === 'Identifier') {
            var debug = null;
        } else if (node.type === 'VariableDeclarator') {
            attributes = findAndMergeAttributes(node, functionParametersName, { ...attributes }, null, props)
            const response = findAttributes(node.init, functionParametersName, props);
            attributes = mergeAttributes(attributes, response);
        } else if (node.type === 'VariableDeclaration') {
            for (let idxDeclaration = 0; idxDeclaration < node.declarations?.length; ++idxDeclaration) {
                const declaration = node.declarations[idxDeclaration];
                if (declaration.end === 2562) {
                    var debug = null;
                }

                const response = findAttributes(declaration, functionParametersName, props);
                attributes = mergeAttributes(attributes, response);
                var debug = null;
            }
        } else if (node.type === 'ReturnStatement') {
            const response = findAttributes(node.argument, functionParametersName, props);
            attributes = mergeAttributes(attributes, response);
            var debug = null;
        } else if (node.type === 'BlockStatement') {
            for (let idxBody = 0; idxBody < node.body.length; ++idxBody) {
                const bodyNode = node.body[idxBody];
                const response = findAttributes(bodyNode, functionParametersName, props);
                attributes = mergeAttributes(attributes, response);
                var debug = null;
            }
            var debug = null;
        } else if (['CatchClause', 'ArrowFunctionExpression'].includes(node.type)) {
            const response = findAttributes(node.body, functionParametersName, props);
            attributes = mergeAttributes(attributes, response);
            var debug = null;
        }

        return attributes;
    } catch (err) {
        return attributes;
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
            let extension = await utils.getExtension(solvedPath);
            if (extension === '' && (await utils.getExtension('.' + solvedPath)) !== '') {
                solvedPath = '.' + solvedPath;
            } else if (fs.existsSync(solvedPath) && fs.lstatSync(solvedPath).isDirectory()) {
                extension = await utils.getExtension(solvedPath + '/index');
                if (extension !== '') {
                    solvedPath = solvedPath + '/index';
                }
            }
            solvedPath = solvedPath.replaceAll('//', '/');
            solvedPath = solvedPath.replaceAll('\\\\', '\\');
            solvedPath = solvedPath + extension;
        } else {
            solvedPath = relativePath + path.trim().replaceAll('./', '/');

            let extension = await utils.getExtension(solvedPath);
            if (extension === '' && (await utils.getExtension('.' + solvedPath)) !== '') {
                solvedPath = '.' + solvedPath;
            } else if (fs.existsSync(solvedPath) && fs.lstatSync(solvedPath).isDirectory()) {
                extension = await utils.getExtension(solvedPath + '/index');
                if (extension !== '') {
                    solvedPath = solvedPath + '/index';
                }
            }
            solvedPath = solvedPath.replaceAll('//', '/');
            solvedPath = solvedPath.replaceAll('\\\\', '\\');
            solvedPath = solvedPath + extension;
        }
    }
    return solvedPath;
}


module.exports = {
    setOptions,
    processFile
};
