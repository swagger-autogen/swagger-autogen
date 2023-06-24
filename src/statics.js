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

const UNKNOWN = '\x00\x00\x00\x01\x01\x00\x00\x00';
const SWAGGER_TAG = '#swagger';
const STRING_BREAKER = `___${UNKNOWN}___`; // for line break and return without text changes.
const STRING_QUOTE = '__¬¬¬¬__QUOTE__¬¬¬¬__';
const METHODS = ['get', 'head', 'post', 'put', 'delete', 'patch', 'options'];
const RESERVED_FUNCTIONS = ['if', 'for', 'while', 'forEach'];
const QUOTES = ['"', "'", '`'];

module.exports = {
    UNKNOWN,
    TEMPLATE,
    SWAGGER_TAG,
    STRING_BREAKER,
    METHODS,
    RESERVED_FUNCTIONS,
    STRING_QUOTE,
    QUOTES
};
