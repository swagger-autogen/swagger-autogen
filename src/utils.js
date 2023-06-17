const fs = require('fs');
const glob = require('glob');

let globalOptions = {};
function setOptions(options) {
    globalOptions = options;
}

/**
 * Check if 'path' is a directory or a file
 *
 * @param {string} path
 * @returns
 */
async function fileOrDirectoryExist(path) {
    try {
        if (fs.lstatSync(path).isDirectory()) {
            return { isDirectory: true, isFile: false };
        }
        await fs.promises.access(path);
        return { isDirectory: false, isFile: true };
    } catch (error) {
        return { isDirectory: false, isFile: false };
    }
}

/**
 * Get file extension.
 * @param {string} fileName
 */
async function getExtension(fileName) {
    try {
        let extensios = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];
        let data = fileName.split('.').slice(-1)[0].toLowerCase();
        if (extensios.includes(data)) {
            return '';
        }

        for (let idx = 0; idx < extensios.length; ++idx) {
            if (fs.existsSync(fileName + extensios[idx])) {
                return extensios[idx];
            }
        }
        return '';
    } catch (err) {
        return '';
    }
}

/**
 * Get file content.
 * @param {string} pathFile
 */
function getFileContent(pathFile) {
    return new Promise(resolve => {
        fs.readFile(pathFile, 'utf8', function (err, data) {
            if (err) {
                return resolve(null);
            }
            return resolve(data);
        });
    });
}

/**
 * Check if the input parameter is a number
 * @param {*} n
 */
function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Get first substring between two characters (startSymbol and endSymbol).
 * This method return remove the first character (startSymbol)
 * @param {string} data file content.
 * @param {string} startSymbol
 * @param {string} endSymbol
 */
function stackSymbolRecognizer(data, startSymbol, endSymbol, ignoreString = true) {
    return new Promise(resolve => {
        if (!data) {
            return resolve(data);
        }

        const origData = data;
        try {
            let stack = 1;
            let ignore = false;
            let strSymbol = null;
            data = data
                .split('')
                .filter((c, idx) => {
                    if (ignoreString && (c == "'" || c == '"' || c == '`') && !strSymbol) {
                        strSymbol = c;
                        ignore = true;
                    } else if (ignoreString && strSymbol == c && data[idx - 1] != '\\') {
                        strSymbol = null;
                        ignore = false;
                    }
                    if (stack <= 0) return false;
                    if (c == startSymbol && !ignore) {
                        stack += 1;
                    }
                    if (c == endSymbol && !ignore) {
                        stack -= 1;
                    }
                    return true;
                })
                .join('');
            return resolve(data);
        } catch (err) {
            return resolve(origData);
        }
    });
}

/**
 * Get first substring between two characters (startSymbol and endSymbol)
 * @param {string} data file content.
 * @param {string} startSymbol
 * @param {string} endSymbol
 */
function stack0SymbolRecognizer(data, startSymbol, endSymbol, keepSymbol = false) {
    return new Promise(resolve => {
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
                        return resolve(startSymbol + strVect.slice(1) + endSymbol);
                    }
                    return resolve(strVect.slice(1));
                }
            }
        } catch (err) {
            if (keepSymbol) {
                return resolve(startSymbol + endSymbol);
            }
            return resolve('');
        }
    });
}

function resolvePatternPath(path) {
    return new Promise(resolve => {
        glob(path, function (err, files) {
            if (err) {
                return resolve(null);
            }
            return resolve(files);
        });
    });
}

function getFirstPosition(param, data) {
    if (data && param) {
        let position = data.split(param).shift();
        if (position.length == data.length) {
            return null;
        }
        return position.length;
    }
    return null;
}

function removeRegex(data) {
    if (!data || data.length == 0) {
        return data;
    }

    let strToReturn = '';
    let stackComment1 = 0; // For type  //
    let stackComment2 = 0; // For type  /* */

    let buffer = ''; // For type   /* */

    // Won't remove comments in strings
    let isStr1 = 0; // "
    let isStr2 = 0; // '
    let isStr3 = 0; // `
    try {
        for (let idx = 0; idx < data.length; ++idx) {
            let c = data[idx];

            // If in comments or regex, ignore strings
            if (stackComment1 == 0 && stackComment2 == 0) {
                // Type '
                if (c == "'" && (data[idx - 1] != '\\' || (data[idx - 1] == '\\' && data[idx - 2] == '\\')) && isStr1 == 1) {
                    isStr1 = 2;
                } else if (c == "'" && (data[idx - 1] != '\\' || (data[idx - 1] == '\\' && data[idx - 2] == '\\')) && isStr1 == 0 && isStr2 == 0 && isStr3 == 0) {
                    isStr1 = 1;
                }

                // Type  "
                else if (c == '"' && (data[idx - 1] != '\\' || (data[idx - 1] == '\\' && data[idx - 2] == '\\')) && isStr2 == 1) {
                    isStr2 = 2;
                } else if (c == '"' && (data[idx - 1] != '\\' || (data[idx - 1] == '\\' && data[idx - 2] == '\\')) && isStr1 == 0 && isStr2 == 0 && isStr3 == 0) {
                    isStr2 = 1;
                }

                // Type  `
                else if (c == '`' && (data[idx - 1] != '\\' || (data[idx - 1] == '\\' && data[idx - 2] == '\\')) && isStr3 == 1) {
                    isStr3 = 2;
                } else if (c == '`' && (data[idx - 1] != '\\' || (data[idx - 1] == '\\' && data[idx - 2] == '\\')) && isStr1 == 0 && isStr2 == 0 && isStr3 == 0) {
                    isStr3 = 1;
                }
            }

            // Type //
            if (c == '/' && data[idx + 1] == '/' && data[idx - 1] != '\\' && data[idx - 1] != ':' && stackComment1 == 0 && stackComment2 == 0) {
                // REFACTOR: improve this. Avoiding cases such as: ... http://... be handled as a comment
                stackComment1 = 1;
            } else if (c == '\n' && stackComment1 == 1) {
                stackComment1 = 2;
            }

            // Type  /* */
            else if (c == '/' && data[idx + 1] == '*' && data[idx - 1] != '\\' && stackComment1 == 0 && stackComment2 == 0 && isStr1 == 0 && isStr2 == 0 && isStr3 == 0) {
                stackComment2 = 1;
            } else if (c == '/' && data[idx - 1] == '*' && stackComment2 == 1 && isStr1 == 0 && isStr2 == 0 && isStr3 == 0 && buffer != '/*') {
                stackComment2 = 2;
            }

            /**
             * REGEX START
             */
            if (c == '/' && data[idx - 1] != '\\' && data[idx + 1] != '/' && isStr1 == 0 && isStr2 == 0 && isStr3 == 0 && stackComment1 == 0 && stackComment2 == 0) {
                // Checking if it is valid regex
                let lidx = idx + 1;
                let lstr = '';
                let regexStackParenthesis = 0;
                let regexStackSquareBracket = 0;

                while (lidx < data.length) {
                    let lc = data[lidx];

                    if (lc == '(') {
                        regexStackParenthesis += 1;
                    } else if (lc == ')') {
                        regexStackParenthesis -= 1;
                    } else if (lc == '[') {
                        regexStackSquareBracket += 1;
                    } else if (lc == ']') {
                        regexStackSquareBracket -= 1;
                    }

                    lstr += lc;
                    lidx += 1;

                    if (data[lidx] == '/' && data[idx - 1] != '\\' && regexStackParenthesis < 1 && regexStackSquareBracket < 1) {
                        if (regexStackParenthesis < 0) {
                            regexStackParenthesis = 0;
                        }
                        if (regexStackSquareBracket < 0) {
                            regexStackSquareBracket = 0;
                        }
                        break;
                    }
                }

                try {
                    if (''.split(new RegExp(lstr)).length > -1) {
                        // Valid regex
                        data = replaceRange(data, idx, lidx + 1, ' ');
                        c = data[idx];
                    }
                } catch (err) {
                    // Invalid regex
                }
            }
            /* REGEX END */

            strToReturn += c;

            if (stackComment1 == 2) {
                stackComment1 = 0;
            }

            if (stackComment2 == 2) {
                stackComment2 = 0;
            }

            if (isStr1 == 2) isStr1 = 0;
            if (isStr2 == 2) isStr2 = 0;
            if (isStr3 == 2) isStr3 = 0;

            if (idx == data.length - 1) {
                return strToReturn;
            }
        }
    } catch (err) {
        return strToReturn;
    }
}

/**
 * Get the first string in a string.
 * @param {string} data content.
 */
function popString(data, keepQuote = false) {
    if (!data) {
        return null;
    }

    try {
        data = removeRegex(data);

        let quote = null;
        let onString = false;
        let string = '';
        for (let i = 0; i < data.length; ++i) {
            let c = data[i];

            if (quote) {
                string += c;
            }

            if (onString && c == quote && data[i - 1] !== '\\') {
                if (!keepQuote) {
                    return string.slice(0, -1);
                }
                return c + string;
            }

            if (!onString && /'|"|`/.test(c) && data[i - 1] !== '\\') {
                quote = c;
                onString = true;
            }
        }
        return null;
    } catch (err) {
        return null;
    }
}

/**
 * Sort parameters. (in test)
 * @param {Array} parameters
 */
async function sortParameters(paths) {
    let exceptionParameters = ['user', 'username', 'pass', 'password'];
    try {
        if (globalOptions.sortParameters.toLowerCase() == 'alphabetically') {
            let pathList = Object.entries(paths);
            for (let idxPath = 0; idxPath < Object.entries(paths).length; ++idxPath) {
                let path = pathList[idxPath][0];
                let methods = Object.entries(pathList[idxPath][1]);
                for (let idx = 0; idx < methods.length; ++idx) {
                    let method = methods[idx][0];
                    let parameters = methods[idx][1].parameters;
                    if (parameters && parameters.length > 0) {
                        let sortedParameters = parameters.sort((a, b) => sortAlphabetically(a, b));
                        sortedParameters = sortedParameters.sort((a, b) => sortByRequestType(a, b));
                        sortedParameters = sortedParameters.sort((a, b) => sortByPathParameter(a, b));

                        // Sorting the body (Swagger2). TODO: OpenAPIv3
                        for (let idxBody = 0; idxBody < sortedParameters.length; ++idxBody) {
                            let param = sortedParameters[idxBody];
                            if (param && param.schema && param.schema.properties) {
                                let sortedProperties = sortObjectKeyAlphabetically(param.schema.properties);
                                let bodyParameters = Object.keys(sortedProperties);
                                if (bodyParameters.length == 2 && param.schema.properties) {
                                    // Sort exception for user/username and pass/password
                                    if (exceptionParameters.slice(2, 4).includes(bodyParameters[0].toLocaleLowerCase()) && exceptionParameters.slice(0, 2).includes(bodyParameters[1].toLocaleLowerCase())) {
                                        sortedParameters[idxBody].schema.properties = {};
                                        sortedParameters[idxBody].schema.properties[bodyParameters[1]] = sortedProperties[bodyParameters[1]];
                                        sortedParameters[idxBody].schema.properties[bodyParameters[0]] = sortedProperties[bodyParameters[0]];
                                        break;
                                    }
                                }
                                sortedParameters[idxBody].schema.properties = sortedProperties;
                            }
                        }

                        paths[path][method].parameters = sortedParameters;
                    }
                }
            }
        }
        return paths;
    } catch (err) {
        return paths;
    }
}

function sortObjectKeyAlphabetically(list) {
    return Object.keys(list)
        .sort((a, b) => sortAlphabetically(a, b))
        .reduce((obj, key) => {
            obj[key] = list[key];
            return obj;
        }, {});
}

function sortAlphabetically(a, b) {
    if (a.name && b.name && a.in != 'path' && b.in != 'path') {
        if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return -1;
        }
        if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return 1;
        }
    } else if (a && b) {
        if (a.toLowerCase() < b.toLowerCase()) {
            return -1;
        }
        if (a.toLowerCase() > b.toLowerCase()) {
            return 1;
        }
    }
    return 0;
}

function sortByRequestType(a, b) {
    return a.in && b.in && b.in.length - a.in.length;
}

function sortByPathParameter(a, b) {
    if (a.in == 'path' && b.in != 'path') {
        return -1;
    }
    if (a.in != 'path' && b.in == 'path') {
        return 1;
    }
    return 0;
}

function replaceRange(str, start, end, substitute) {
    return str.substring(0, start) + substitute + str.substring(end);
}

module.exports = {
    fileOrDirectoryExist,
    getExtension,
    getFileContent,
    isNumeric,
    resolvePatternPath,
    stackSymbolRecognizer,
    stack0SymbolRecognizer,
    getFirstPosition,
    popString,
    replaceRange,
    setOptions,
    sortParameters
};
