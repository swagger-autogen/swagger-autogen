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
function stackSymbolRecognizer(data, startSymbol, endSymbol) {
    return new Promise(resolve => {
        if (!data) {
            return resolve(data);
        }

        let stack = 1;
        data = data
            .split('')
            .filter(c => {
                if (stack <= 0) return false;
                if (c == startSymbol) stack += 1;
                if (c == endSymbol) stack -= 1;
                return true;
            })
            .join('');
        return resolve(data);
    });
}

/**
 * Get first substring between two characters (startSymbol and endSymbol)
 * @param {string} data file content.
 * @param {string} startSymbol
 * @param {string} endSymbol
 */
function stack0SymbolRecognizer(data, startSymbol, endSymbol) {
    return new Promise(resolve => {
        let stack = 0;
        let rec = 0;
        let strVect = [];

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
                return resolve(strVect.slice(1));
            }
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

module.exports = {
    fileOrDirectoryExist,
    getExtension,
    getFileContent,
    isNumeric,
    resolvePatternPath,
    stackSymbolRecognizer,
    stack0SymbolRecognizer
};
