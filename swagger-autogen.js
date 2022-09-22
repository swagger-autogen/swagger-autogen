require('./src/prototype-functions');
const fs = require('fs');
const swaggerTags = require('./src/swagger-tags');
const handleFiles = require('./src/handle-files');
const statics = require('./src/statics');
const utils = require('./src/utils');
const handleData = require('./src/handle-data');

const { platform } = process;
const symbols = platform === 'win32' ? { success: '', failed: '' } : { success: '✔', failed: '✖' };

let options = null;
let recLang = null;

module.exports = function (args, endpointsFiles, data) {
    let outputFile = null;
    options = { language: null, disableLogs: false, disableWarnings: false, openapi: null, autoHeaders: true, autoQuery: true, autoBody: true, autoResponse: true };
    if (args && endpointsFiles) {
        outputFile = args;
        args = null;
    }
    if (args && typeof args === 'string') {
        // will be deprecated in a future version
        recLang = args;
    } else if (args && typeof args === 'object') {
        options = { ...options, ...args };
    }

    options.language = recLang || options.language || 'en-US';
    handleFiles.setOptions(options);
    handleData.setOptions(options);

    swaggerTags.setLanguage(recLang || options.language || 'en-US');
    swaggerTags.setOpenAPI(options.openapi);
    swaggerTags.setDisableLogs(options.disableLogs);

    if(outputFile && endpointsFiles){
        return init(outputFile, endpointsFiles, data);
    } else {
        return async (outputFile, endpointsFiles, data) => init(outputFile, endpointsFiles, data);
    }
};

const init = async (outputFile, endpointsFiles, data) => {
    try {
        if (!outputFile) throw console.error("\nError: 'outputFile' was not specified.");
        if (!endpointsFiles) throw console.error("\nError: 'endpointsFiles' was not specified.");

        const legacyOutputFile = outputFile
        if (platform === 'win32') {
            // TODO: Implement relative path for Windows
        } else if (outputFile.split(new RegExp("^/")).length == 1 && process && process.argv[1]) {
            let basePath = process.argv[1].split('/').slice(0, -1).join('/');
            outputFile = await handleFiles.resolvePathFile(outputFile, basePath);
        }

        let allFiles = [];
        // Checking if endpoint files exist
        for (let idx = 0; idx < endpointsFiles.length; ++idx) {
            let file = endpointsFiles[idx];
            const legacyFilePath = file;

            if (platform === 'win32') {
                // TODO: Implement relative path for Windows
            } else if (file.split(new RegExp("^/")).length == 1 && process && process.argv[1]) {
                let basePath = process.argv[1].split('/').slice(0, -1).join('/');
                file = await handleFiles.resolvePathFile(file, basePath);
            }

            if (file.includes('*')) {
                const patternPath = await utils.resolvePatternPath(file)
                if (patternPath) {
                    for (let idxFile = 0; idxFile < patternPath.length; ++idxFile) {
                        let file = patternPath[idxFile]
                        let extension = await utils.getExtension(file);

                        if (!fs.existsSync(file + extension)) {
                            throw console.error("[swagger-autogen]: Error! File not found: '" + file + "'");
                        } else {
                            patternPath[idxFile] = file + extension;
                        }
                    }
                    allFiles = [...allFiles, ...patternPath];
                }
            } else {
                let extension = await utils.getExtension(file);
                if (!fs.existsSync(file + extension)) {
                    file = legacyFilePath;  // To legacy cases. Will be deprecated in the future
                    if (!fs.existsSync(file + extension)) {
                        throw console.error("[swagger-autogen]: Error! File not found: '" + file + "'");
                    }
                }
                allFiles = [...allFiles, file + extension];
            }
        }

        const objDoc = { ...statics.TEMPLATE, ...data, paths: {} };

        if (options.openapi && utils.isNumeric(options.openapi.replaceAll('.', ''))) {
            objDoc.openapi = options.openapi;
        } else {
            objDoc.swagger = '2.0';
        }

        // Removing all null attributes
        for (let key in objDoc) {
            if (objDoc[key] === null) {
                delete objDoc[key];
            }
        }

        if (!objDoc.info.version) {
            objDoc.info.version = statics.TEMPLATE.info.version;
        }
        if (!objDoc.info.title) {
            objDoc.info.title = statics.TEMPLATE.info.title;
        }
        if (!objDoc.info.description) {
            objDoc.info.description = statics.TEMPLATE.info.description;
        }

        for (let file = 0; file < allFiles.length; file++) {
            const filePath = allFiles[file];
            const resp = fs.existsSync(filePath);
            if (!resp) {
                console.error('[swagger-autogen]: Error! Endpoint file not found => ' + "'" + filePath + "'");
                if (!options.disableLogs) {
                    console.log('Swagger-autogen:', '\x1b[31m', 'Failed ' + symbols.failed, '\x1b[0m');
                }
                return false;
            }

            let relativePath = filePath.split('/');
            if (relativePath.length > 1) {
                relativePath.pop();
                relativePath = relativePath.join('/');
            } else {
                relativePath = null;
            }

            let obj = await handleFiles.readEndpointFile(filePath, '', relativePath, []);
            if (obj === false) {
                if (!options.disableLogs) {
                    console.log('Swagger-autogen:', '\x1b[31m', 'Failed ' + symbols.failed, '\x1b[0m');
                }
                return false;
            }
            objDoc.paths = { ...objDoc.paths, ...obj };
        }
        let constainXML = false;
        if (JSON.stringify(objDoc).includes('application/xml')) {
            // REFACTOR: improve this
            constainXML = true;
        }
        Object.keys(objDoc.definitions).forEach(definition => {
            if (constainXML) {
                objDoc.definitions[definition] = { ...swaggerTags.formatDefinitions(objDoc.definitions[definition], {}, constainXML), xml: { name: definition } };
            } else {
                objDoc.definitions[definition] = { ...swaggerTags.formatDefinitions(objDoc.definitions[definition], {}, constainXML) };
            }
        });

        if (objDoc['@definitions']) {
            if (!objDoc.definitions) {
                objDoc.definitions = {};
            }
            objDoc.definitions = { ...objDoc.definitions, ...objDoc['@definitions'] };
            delete objDoc['@definitions'];
        }

        /**
         * Forcing convertion to OpenAPI 3.x
         */
        if (objDoc.openapi) {
            if (!objDoc.servers || objDoc.servers.length == 0) {
                if (objDoc.host) {
                    if (objDoc.basePath) {
                        objDoc.host += objDoc.basePath
                    }
                    if (objDoc.host.slice(0, 4).toLowerCase() != 'http') {
                        if (objDoc.schemes && objDoc.schemes.length > 0) {
                            objDoc.schemes.forEach(scheme => {
                                objDoc.servers.push(
                                    {
                                        url: scheme + '://' + objDoc.host
                                    }
                                )
                            })
                        } else {
                            objDoc.host = 'http://' + objDoc.host
                            objDoc.servers = [
                                {
                                    url: objDoc.host
                                }
                            ]
                        }
                    }

                    delete objDoc.host
                } else {
                    delete objDoc.servers
                }
            } else {
                delete objDoc.host
            }

            if (objDoc.components && objDoc.components.schemas) {
                Object.keys(objDoc.components.schemas).forEach(schema => {
                    if (constainXML) {
                        objDoc.components.schemas[schema] = { ...swaggerTags.formatDefinitions(objDoc.components.schemas[schema], {}, constainXML), xml: { name: schema } };
                    } else {
                        objDoc.components.schemas[schema] = { ...swaggerTags.formatDefinitions(objDoc.components.schemas[schema], {}, constainXML) };
                    }
                });
            }

            if (objDoc.components && objDoc.components['@schemas']) {
                if (!objDoc.components) {
                    objDoc.components = {};
                }
                if (!objDoc.components.schemas) {
                    objDoc.components.schemas = {};
                }
                objDoc.components.schemas = { ...objDoc.components.schemas, ...objDoc.components['@schemas'] };
                delete objDoc.components['@schemas'];
            }

            if (objDoc.components && objDoc.components.examples) {
                Object.keys(objDoc.components.examples).forEach(example => {
                    if (!objDoc.components.examples[example].value) {
                        let auxExample = { ...objDoc.components.examples[example] }
                        delete objDoc.components.examples[example]
                        objDoc.components.examples[example] = {
                            value: auxExample
                        }
                    }
                });
            }

            if (objDoc.definitions && Object.keys(objDoc.definitions).length > 0) {
                if (!objDoc.components) {
                    objDoc.components = {}
                }
                if (!objDoc.components.schemas) {
                    objDoc.components.schemas = {}
                }

                objDoc.components.schemas = {
                    ...objDoc.components.schemas,
                    ...objDoc.definitions
                }

                delete objDoc.definitions
            }

            if (objDoc.securityDefinitions && Object.keys(objDoc.securityDefinitions).length > 0) {
                if (!objDoc.components) {
                    objDoc.components = {}
                }
                if (!objDoc.components.securitySchemes) {
                    objDoc.components.securitySchemes = {}
                }

                objDoc.components.securitySchemes = {
                    ...objDoc.components.securitySchemes,
                    ...objDoc.securityDefinitions
                }

                delete objDoc.securityDefinitions
            }

            if (objDoc.basePath) {
                delete objDoc.basePath
            }
            if (objDoc.schemes) {
                delete objDoc.schemes
            }
            if (objDoc.consumes) {
                delete objDoc.consumes
            }
            if (objDoc.produces) {
                delete objDoc.produces
            }
            if (objDoc.definitions) {
                delete objDoc.definitions
            }
        }

        /**
         * Removing unused parameters
         */
        if (objDoc.components && Object.keys(objDoc.components).length == 0) {
            delete objDoc.components;
        }
        if (objDoc.servers && Object.keys(objDoc.servers).length == 0) {
            delete objDoc.servers;
        }
        if(objDoc.tags && objDoc.tags.length == 0){
            delete objDoc.tags;
        }
        if(objDoc.consumes && objDoc.consumes.length == 0){
            delete objDoc.consumes;
        }
        if(objDoc.produces && objDoc.produces.length == 0){
            delete objDoc.produces;
        }
        if(objDoc.definitions && Object.keys(objDoc.definitions).length == 0){
            delete objDoc.definitions;
        }

        let dataJSON = JSON.stringify(objDoc, null, 2);
        try {
            fs.writeFileSync(outputFile, dataJSON);
        } catch (err) {
            try {
                fs.writeFileSync(legacyOutputFile, dataJSON); // To legacy cases. Will be deprecated in the future
            } catch (err) {
                throw console.error("[swagger-autogen]: Error! Could not generate output file.\nInvalid path: '" + outputFile + "'");
            }
        }
        if (!options.disableLogs) {
            console.log('Swagger-autogen:', '\x1b[32m', 'Success ' + symbols.success, '\x1b[0m');
        }
        return { success: true, data: objDoc };
    } catch (err) {
        if (!options.disableLogs) {
            console.log('Swagger-autogen:', '\x1b[31m', 'Failed ' + symbols.failed, '\x1b[0m');
        }
        return { success: false, data: null };
    }
};