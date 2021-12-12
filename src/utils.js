const fs = require('fs');
const glob = require('glob');

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
        let data = fileName.split('.').slice(-1)[0].toLowerCase();
        if (data == 'js' || data == 'ts' || data == 'jsx' || data == 'jsx') {
            return '';
        }

        let extensios = ['.js', '.ts', '.jsx', '.tsx'];
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
                    if (c == startSymbol && !ignore) stack += 1;
                    if (c == endSymbol && !ignore) stack -= 1;
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

                if (idx === data.length - 1) {
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

module.exports = {
    fileOrDirectoryExist,
    getExtension,
    getFileContent,
    isNumeric,
    resolvePatternPath,
    stackSymbolRecognizer,
    stack0SymbolRecognizer,
    getFirstPosition
};
