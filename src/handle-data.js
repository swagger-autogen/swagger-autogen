const swaggerTags = require('./swagger-tags')
const statics = require('./statics')
const tables = require('./tables')

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n)
}

function clearData(data) {
    // Change "// ..." comment to "/* ... */" 
    data = data.replaceAll('*//*', '*/\n/*')
    data = data.replaceAll('*///', '*/\n//')
    data = data.replaceAll('///', '//')
    data = data.split('//').map((e, idx) => {
        if (idx != 0)
            return e.replace('\n', ' */ \n')
        return e
    })
    data = data.join('//').replaceAll('//', '/*')

    let aData = data.replaceAll('\n', statics.STRING_BREAKER)
    aData = aData.replaceAll('\t', ' ')
    aData = aData.replaceAll("Content-Type", "content-type")
    aData = aData.replaceAll("CONTENT-TYPE", "content-type")
    aData = aData.replaceAll("\"content-type\"", "__¬¬¬__content-type__¬¬¬__").replaceAll("\"application/json\"", "__¬¬¬__application/json__¬¬¬__").replaceAll("\"application/xml\"", "__¬¬¬__application/xml__¬¬¬__")
    aData = aData.replaceAll("\'content-type\'", "__¬¬¬__content-type__¬¬¬__").replaceAll("\'application/json\'", "__¬¬¬__application/json__¬¬¬__").replaceAll("\'application/xml\'", "__¬¬¬__application/xml__¬¬¬__")
    aData = aData.replaceAll("\`content-type\`", "__¬¬¬__content-type__¬¬¬__").replaceAll("\`application/json\`", "__¬¬¬__application/json__¬¬¬__").replaceAll("\`application/xml\`", "__¬¬¬__application/xml__¬¬¬__")
    aData = aData.replaceAll(statics.STRING_BREAKER, '\n')
    aData = aData.replaceAll(" async ", '')
    return aData
}

function removeComments(data, keepSwaggerTags = false) {
    return new Promise(async (resolve, reject) => {

        var strToReturn = ''
        var stackComment1 = 0; // For type  //
        var stackComment2 = 0; // For type  /* */

        var buffer1 = '' // For type  //
        var buffer2 = '' // For type   /* */

        // Won't remove comments in strings
        var isStr1 = 0   // "
        var isStr2 = 0   // '
        var isStr3 = 0   // `

        for (var idx = 0; idx < data.length; ++idx) {
            let c = data[idx]

            if (stackComment1 == 0 && stackComment2 == 0) {
                // Type '
                if (c == '\'' && data[idx - 1] != '\\' && isStr1 == 1)
                    isStr1 = 2
                if (c == '\'' && data[idx - 1] != '\\' && isStr1 == 0 && isStr2 == 0 && isStr3 == 0)
                    isStr1 = 1

                // Type  "
                if (c == '\"' && data[idx - 1] != '\\' && isStr2 == 1)
                    isStr2 = 2
                if (c == '\"' && data[idx - 1] != '\\' && isStr1 == 0 && isStr2 == 0 && isStr3 == 0)
                    isStr2 = 1

                // Type  `
                if (c == '\`' && data[idx - 1] != '\\' && isStr3 == 1)
                    isStr3 = 2
                if (c == '\`' && data[idx - 1] != '\\' && isStr1 == 0 && isStr2 == 0 && isStr3 == 0)
                    isStr3 = 1
            }

            // Type //
            if (c == '/' && data[idx + 1] == '/' && stackComment1 == 0 && stackComment2 == 0)
                stackComment1 = 1
            if (c == '\n' && stackComment1 == 1)
                stackComment1 = 2

            // Type  /* */
            if (c == '/' && data[idx + 1] == '*' && stackComment1 == 0 && stackComment2 == 0)
                stackComment2 = 1
            if (c == '/' && data[idx - 1] == '*' && stackComment2 == 1)
                stackComment2 = 2

            if (isStr1 > 0 || isStr2 > 0 || (stackComment1 == 0 && stackComment2 == 0)) {
                strToReturn += c
            } else if (stackComment1 == 1 || stackComment1 == 2) { // Keeps the comment being ignored. Like: //
                buffer1 += c
            } else if (stackComment2 == 1 || stackComment2 == 2) { // Keeps the comment being ignored. Like: /* */
                buffer2 += c
            }

            if (stackComment1 == 2) {
                stackComment1 = 0
                if (buffer1.includes('#swagger.') && keepSwaggerTags) {
                    strToReturn += buffer1  // keeping the comment that has a swagger tag
                    buffer1 = ''
                } else
                    buffer1 = ''
            }

            if (stackComment2 == 2) {
                stackComment2 = 0
                if (buffer2.includes('#swagger.') && keepSwaggerTags) {
                    strToReturn += buffer2  // keeping the comment that has a swagger tag
                    buffer2 = ''
                } else
                    buffer2 = ''
            }

            if (isStr1 == 2)
                isStr1 = 0
            if (isStr2 == 2)
                isStr2 = 0
            if (isStr3 == 2)
                isStr3 = 0

            if (idx == data.length - 1) {
                strToReturn = strToReturn.replaceAll('  ', ' ').replaceAll('  ', ' ').replaceAll('  ', ' ').replaceAll('  ', ' ')
                return resolve(strToReturn)
            }
        }
    })
}

function removeStrings(data) {
    return new Promise((resolve, reject) => {

        var strToReturn = ''
        var stackStr1 = 0; // For type  '
        var stackStr2 = 0; // For type  "
        var stackStr3 = 0; // For type  `

        var stackComment1 = 0; // For type  //
        var stackComment2 = 0; // For type  /* */

        for (var idx = 0; idx < data.length; ++idx) {
            let c = data[idx]

            // Type '
            if (c == '\'' && data[idx - 1] != '\\' && stackStr1 == 1)
                stackStr1 = 2
            if (c == '\'' && data[idx - 1] != '\\' && stackStr1 == 0 && stackStr2 == 0 && stackStr3 == 0 && stackComment1 == 0 && stackComment2 == 0)
                stackStr1 = 1

            // Type  "
            if (c == '\"' && data[idx - 1] != '\\' && stackStr2 == 1)
                stackStr2 = 2
            if (c == '\"' && data[idx - 1] != '\\' && stackStr1 == 0 && stackStr2 == 0 && stackStr3 == 0 && stackComment1 == 0 && stackComment2 == 0)
                stackStr2 = 1

            // Type  `
            if (c == '\`' && data[idx - 1] != '\\' && stackStr3 == 1)
                stackStr3 = 2
            if (c == '\`' && data[idx - 1] != '\\' && stackStr1 == 0 && stackStr2 == 0 && stackStr3 == 0 && stackComment1 == 0 && stackComment2 == 0)
                stackStr3 = 1

            if (stackStr1 == 0 && stackStr2 == 0 && stackStr3 == 0 && stackComment1 == 0 && stackComment2 == 0) {
                strToReturn += c
            }

            if (stackStr1 == 2)
                stackStr1 = 0
            if (stackStr2 == 2)
                stackStr2 = 0
            if (stackStr3 == 2)
                stackStr3 = 0

            if (idx == data.length - 1) {
                strToReturn = strToReturn.replaceAll('  ', ' ').replaceAll('  ', ' ').replaceAll('  ', ' ').replaceAll('  ', ' ')
                return resolve(strToReturn)
            }
        }
    })
}

function addReferenceToMethods(data, pattern) {
    return new Promise((resolve, reject) => {
        let auxData = data

        // Tratando caso: router.route('/user').get(authorize, (req, res) => {
        let aDataRoute = auxData.split(new RegExp(".*\\.route\\s*\\("))
        if (aDataRoute.length > 1) {
            for (var idx = 1; idx < aDataRoute.length; ++idx) {
                // app.get([_[get]_])('/automatic1/users/:id', (req, res) => {
                for (var mIdx = 0; mIdx < statics.METHODS.length; ++mIdx) {
                    let method = statics.METHODS[mIdx]
                    let line = aDataRoute[idx].split(new RegExp(`\\)(\\s*|\\n*)\\.${method}\\s*\\(`))
                    if (line.length === 3) {
                        aDataRoute[idx] = (pattern || '_app') + `.${method}(` + line[0] + ',' + line[2]
                        break
                    }
                }
            }
            auxData = aDataRoute.join('\n')
        }

        for (var idx = 0; idx < statics.METHODS.length; ++idx) {
            let method = statics.METHODS[idx]
            let regexMethods = `.*\\.${method}\\s*\\(`
            auxData = auxData.split(new RegExp(regexMethods))
            auxData = auxData.join((pattern || '_app') + `.${method}([_[${method}]_])(`)

            if (idx == statics.METHODS.length - 1) {
                return resolve(auxData)
            }
        }
    })
}

function stackSymbolRecognizer(data, startSymbol, endSymbol) {
    return new Promise((resolve) => {
        var stack = 1
        data = data.split('').filter(c => {
            if (stack <= 0) return false
            if (c == startSymbol) stack += 1
            if (c == endSymbol) stack -= 1
            return true
        }).join('')
        return resolve(data)
    })
}

function getQueryIndirecty(elem, req, objParameters) {
    if (req && req.split(new RegExp("\\;|\\{|\\(|\\[|\\\"|\\\'|\\\`|\\}|\\)|\\]|\\:|\\,")).length == 1 && elem.split(new RegExp(" .*?\\s*=\\s*" + req + "\\.query(\\s|\\n|;)", "gmi").length > 1)) {
        let queryVars = []
        var aQuerys = elem.split(new RegExp("\\s*=\\s*" + req + "\\.query(\\s|\\n|;)", "i"))
        aQuerys = aQuerys.slice(0, -1)

        if (aQuerys.length > 0) {
            // get variables name
            for (let idx = 0; idx < aQuerys.length; idx++) {  // aQuerys.length -1
                if (aQuerys[idx].replaceAll(' ', '') != '')
                    queryVars.push(aQuerys[idx].split(new RegExp("\s+| ")).slice(-1)[0])
            }
            if (queryVars.length > 0) {
                queryVars.forEach(query => {
                    let varNames = elem.split(new RegExp(" " + query + "\\.")).splice(1)
                    varNames = varNames.map(v => v = v.split(new RegExp(" |;|\n"))[0])
                    varNames.forEach(name => {
                        objParameters[name] = { name, in: 'query' }
                    })
                })
            }
        }
    }
    return objParameters
}

function getStatus(elem, res, objResponses) {
    if (res && (elem.replaceAll(' ', '').includes(res + '.status('))) {
        elem.replaceAll(' ', '').split(res + '.status(').splice(1).forEach(s => {
            let status = s.split(')')[0]
            if (isNumeric(status) && !!objResponses[status] === false) {
                objResponses[status] = { description: tables.getHttpStatusDescription(status, swaggerTags.getLanguage()) }
            } else if (isNumeric(status) && !!objResponses[status] === true) {  // concatenated with existing information
                objResponses[status] = { description: tables.getHttpStatusDescription(status, swaggerTags.getLanguage()), ...objResponses[status] }
            }
        })
    }
    return objResponses
}

function getHeader(elem, path, method, res, objEndpoint) {
    if (res && (elem.replaceAll(' ', '').includes(res + '.setHeader('))) {
        elem = elem.replaceAll(' ', '')
        let aContentType = []
        elem.split(res + '.setHeader(').splice(1).forEach(s => {
            if (s.includes(',') && s.split(',')[0].includes('content-type'))
                aContentType.push(s.split(',\"')[1].split('\")')[0])
        })
        objEndpoint[path][method].produces = aContentType
    }
    return objEndpoint
}

function getQuery(elem, req, objParameters) {
    if (req && (elem.split(req + '.query.').length > 1)) {
        elem.split(req + '.query.').splice(1).forEach(p => {
            let name = p.split(/\(|\)|\{|\}|\[|\]|\/|\\|\;|\:|\?|\+|,|\||\&|\t|\n| /)[0].replaceAll(' ', '')
            if (name.includes('.'))
                name = name.split('.')[0]
            if (!!objParameters[name] === false)    // Checks if the parameter name already exists
                objParameters[name] = { name, in: 'query' }
            if (!objParameters[name].in)
                objParameters[name].in = 'query'
        })
    }
    return objParameters
}

function getCallbackParameters(line) {
    let paramCallback = ''
    let req = null
    let res = null
    let next = null

    if (line.includes(','))
        paramCallback = line.replace(',', statics.STRING_BREAKER).split(statics.STRING_BREAKER)[1].replaceAll(' ', '').split(')')[0].split('=>')[0].split('{')[0]
    if (paramCallback.includes('('))
        paramCallback = paramCallback.split('(')[1]
    if (paramCallback != '') {
        if (!paramCallback.includes(','))
            req = paramCallback.replaceAll('(', '').replaceAll(')', '')
        else {
            paramCallback = paramCallback.split(',')
            if (paramCallback.length == 1) {
                req = paramCallback[0].replaceAll('(', '').replaceAll(')', '')
            } else {
                req = paramCallback[0].replaceAll('(', '').replaceAll(')', '')
                res = paramCallback[1].replaceAll('(', '').replaceAll(')', '')
                if (paramCallback[2])   // NOTE: For future use
                    next = paramCallback[2].replaceAll('(', '').replaceAll(')', '')
            }
        }
    }
    return { req, res, next }
}

function getPathParameters(path, objParameters) {
    if (path.split('{').length > 1) {
        path.split('{').slice(1).forEach(p => {
            let name = p.split('}')[0]
            if (!!objParameters[name] === false)    // Checks if the parameter name already exists
                objParameters[name] = { name, in: 'path', required: true }
        })
    }
    return objParameters
}


async function functionRecognizerInData(data, refFuncao, regex) {
    return new Promise(async (resolve, reject) => {
        var func = null
        refFuncao = refFuncao.split(new RegExp("\\;|\\{|\\(|\\[|\\\"|\\\'|\\\`|\\}|\\)|\\]|\\:|\\,"))
        if (refFuncao.length > 1)
            refFuncao = refFuncao[1]
        else
            refFuncao = refFuncao[0]
        func = data.split(new RegExp(`(${refFuncao}\\s*\\=*\\s*\\(.*\\).*\\{)`))
        if (func.length == 1)
            func = data.split(new RegExp(`(${refFuncao}\\s*\\=*\\s*\\(.*\\)\\s*\\=\\>)`))  // Try to find arrow function
        func.shift()
        func = func.join(' ')

        if (func.length > 1) {
            let arrowFunction = func.split(new RegExp(`(${refFuncao}\\s*\\=*\\s*\\(.*\\)\\s*\\=\\>)`))
            if (func.split(new RegExp(`(${refFuncao}\\s*\\=*\\s*\\(.*\\)\\s*\\=*\\>*\\s*\\{)`)).length > 1) {
                func = func.split('{')
                func.shift()
                func = func.join('{')
                var funcStr = data.split(new RegExp(`${refFuncao}\\s*\\=*\\s*\\(`))[1]
                if (funcStr.split('}').length > 1)
                    funcStr = funcStr.split('{')[0]
                funcStr = '(' + funcStr + '=> {'    // TODO: Verify case 'funcStr' with '=> =>'
                const finalFunc = await stackSymbolRecognizer(func, '{', '}')
                return resolve(funcStr + finalFunc)
            } else if (arrowFunction.length > 1) { // Case: arrow funciton without {, for example: func => func(...);
                var funcStr = data.split(new RegExp(`${refFuncao}\\s*\\=*\\s*\\(`))[1]
                funcStr = funcStr.split('=>')[0]
                funcStr = '(' + funcStr + '=> {'    // TODO: Verify case 'funcStr' with '=> =>'
                arrowFunction = arrowFunction.slice(-1)[0]
                arrowFunction = arrowFunction.split(new RegExp("\\n|\\s|\\;"))
                for (let idx = 0; idx < arrowFunction.length; idx++) {
                    if (arrowFunction[idx] != '')
                        return resolve(funcStr + arrowFunction[idx] + '}')
                    if (idx == arrowFunction.length - 1)
                        return resolve(null)
                }
            } else
                return resolve(null)
        } else
            return resolve(null)
    })
}

function popFunction(functionArray) {
    return new Promise(async (resolve) => {
        if (functionArray.split(new RegExp(`(\\s*\\=*\\s*\\(.*\\)\\s*\\=\\>\\s*\\{)`)).length != 1) {
            let signatureFunc = ''
            let func = functionArray.split('{')
            signatureFunc = func[0] + '{'
            func.shift()
            func = func.join('{')
            func = signatureFunc + await stackSymbolRecognizer(func, '{', '}')
            return resolve(func)
        } else if (functionArray.split(new RegExp(`(\\s*\\=*\\s*\\(.*\\)\\s*\\=\\>)`)).length != 1) {
            // TODO: handle this case: arrow function without "{" and "}"
            return resolve(null)
        } else
            return resolve(null)
    })
}



module.exports = {
    clearData,
    removeComments,
    removeStrings,
    addReferenceToMethods,
    stackSymbolRecognizer,
    getQueryIndirecty,
    getStatus,
    getHeader,
    getQuery,
    getCallbackParameters,
    getPathParameters,
    functionRecognizerInData,
    popFunction
}