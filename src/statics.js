const TEMPLATE = {
    swagger: null,
    openapi: null,
    info: {
        version: '1.0.0',
        title: 'REST API',
        description: ''
    },
    host: 'localhost:3000',
    servers: [],
    basePath: '/',
    tags: [],
    schemes: ['http'],
    securityDefinitions: undefined,
    consumes: [],
    produces: [],
    paths: {},
    definitions: {},
    components: {}
};

const SWAGGER_TAG = '#swagger';
const STRING_BREAKER = '__¬!@#$¬__'; // for line break and return without text changes
const STRING_QUOTE = '__¬!@#_QUOTE_¬!@#__';
const METHODS = ['get', 'head', 'post', 'put', 'delete', 'patch', 'options'];
const RESERVED_FUNCTIONS = ['if', 'for', 'while', 'forEach'];
module.exports = {
    TEMPLATE,
    SWAGGER_TAG,
    STRING_BREAKER,
    METHODS,
    RESERVED_FUNCTIONS,
    STRING_QUOTE
};
