
const TEMPLATE = {
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

const SWAGGER_TAG = '#swagger'
const STRING_BREAKER = '__¬!@#$¬__' // for line break and return without text changes
const METHODS = ['get', 'head', 'post', 'put', 'delete', 'patch', 'options']

module.exports = {
    TEMPLATE,
    SWAGGER_TAG,
    STRING_BREAKER,
    METHODS
}