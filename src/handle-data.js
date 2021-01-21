const swaggerTags = require('./swagger-tags')
const statics = require('./statics')
const tables = require('./tables')

/**
 * TODO: fill
 * @param {*} n 
 */
function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n)
}

/**
 * TODO: fill
 * @param {*} data 
 */
function clearData(data) {
    return new Promise(async (resolve, reject) => {

        // Change "// ..." comment to "/* ... */" 
        data = data.replaceAll('*//*', '*/\n/*')
        data = data.replaceAll('*///', '*/\n//')
        data = data.replaceAll('///', '//')
        data = data.replaceAll('://', ':/' + statics.STRING_BREAKER + '/')  // TODO: improve this. Avoiding cases such as: ... http://... be handled as a comment

        data = data.split('//').map((e, idx) => {
            if (idx != 0)
                return e.replace('\n', ' */ \n')
            return e
        })
        data = data.join('//').replaceAll('//', '/*')
        data = data.replaceAll(':/' + statics.STRING_BREAKER + '/', '://')

        let aData = data.replaceAll('\n', statics.STRING_BREAKER)
        aData = aData.replaceAll('\t', ' ')
        aData = aData.replaceAll("Content-Type", "content-type")
        aData = aData.replaceAll("CONTENT-TYPE", "content-type")
        aData = aData.replaceAll("\"content-type\"", "__¬¬¬__content-type__¬¬¬__").replaceAll("\"application/json\"", "__¬¬¬__application/json__¬¬¬__").replaceAll("\"application/xml\"", "__¬¬¬__application/xml__¬¬¬__")
        aData = aData.replaceAll("\'content-type\'", "__¬¬¬__content-type__¬¬¬__").replaceAll("\'application/json\'", "__¬¬¬__application/json__¬¬¬__").replaceAll("\'application/xml\'", "__¬¬¬__application/xml__¬¬¬__")
        aData = aData.replaceAll("\`content-type\`", "__¬¬¬__content-type__¬¬¬__").replaceAll("\`application/json\`", "__¬¬¬__application/json__¬¬¬__").replaceAll("\`application/xml\`", "__¬¬¬__application/xml__¬¬¬__")
        aData = aData.replaceAll(statics.STRING_BREAKER, '\n')
        aData = aData.replaceAll(" async ", '')
        aData = aData.split(new RegExp("\\s*async\\s*\\("))
        aData = aData.join(' (')
        aData = aData.split(new RegExp("\\:\\s*async\\s*\\("))
        aData = aData.join(': (')
        aData = aData.split(new RegExp("axios\\s*\\n*\\t*\\.\\w*", "i"))
        aData = aData.join('axios.method')

        // TODO: refactor this
        const regex = "\\,\\s*\\n*\\t*\\s*\\n*\\t*\\(\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Request\\s*\\n*\\t*\\s*\\n*\\t*\\,\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Response\\s*\\n*\\t*\\s*\\n*\\t*\\)\\s*\\n*\\t*\\s*\\n*\\t*=>|" +
            "\\,\\s*\\n*\\t*\\s*\\n*\\t*\\(\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Response\\s*\\n*\\t*\\s*\\n*\\t*\\,\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Request\\s*\\n*\\t*\\s*\\n*\\t*\\)\\s*\\n*\\t*\\s*\\n*\\t*=>|" +
            "\\,\\s*\\n*\\t*\\s*\\n*\\t*\\(\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Request\\s*\\n*\\t*\\s*\\n*\\t*\\,\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Response\\s*\\n*\\t*\\s*\\n*\\t*\\,\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Next\\s*\\n*\\t*\\s*\\n*\\t*\\)\\s*\\n*\\t*\\s*\\n*\\t*=>|" +
            "\\,\\s*\\n*\\t*\\s*\\n*\\t*\\(\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Request\\s*\\n*\\t*\\s*\\n*\\t*\\,\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Next\\s*\\n*\\t*\\s*\\n*\\t*\\,\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Response\\s*\\n*\\t*\\s*\\n*\\t*\\)\\s*\\n*\\t*\\s*\\n*\\t*=>|" +
            "\\,\\s*\\n*\\t*\\s*\\n*\\t*\\(\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Response\\s*\\n*\\t*\\s*\\n*\\t*\\,\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Request\\s*\\n*\\t*\\s*\\n*\\t*\\,\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Next\\s*\\n*\\t*\\s*\\n*\\t*\\)\\s*\\n*\\t*\\s*\\n*\\t*=>|" +
            "\\,\\s*\\n*\\t*\\s*\\n*\\t*\\(\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Response\\s*\\n*\\t*\\s*\\n*\\t*\\,\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Next\\s*\\n*\\t*\\s*\\n*\\t*\\,\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Request\\s*\\n*\\t*\\s*\\n*\\t*\\)\\s*\\n*\\t*\\s*\\n*\\t*=>|" +
            "\\,\\s*\\n*\\t*\\s*\\n*\\t*\\(\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Next\\s*\\n*\\t*\\s*\\n*\\t*\\,\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Request\\s*\\n*\\t*\\s*\\n*\\t*\\,\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Response\\s*\\n*\\t*\\s*\\n*\\t*\\)\\s*\\n*\\t*\\s*\\n*\\t*=>|" +
            "\\,\\s*\\n*\\t*\\s*\\n*\\t*\\(\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Next\\s*\\n*\\t*\\s*\\n*\\t*\\,\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Response\\s*\\n*\\t*\\s*\\n*\\t*\\,\\s*\\n*\\t*\\s*\\n*\\t*.+\\s*\\n*\\t*\\s*\\n*\\t*\\:\\s*\\n*\\t*\\s*\\n*\\t*Request\\s*\\n*\\t*\\s*\\n*\\t*\\)\\s*\\n*\\t*\\s*\\n*\\t*=>"

        if (aData.split(new RegExp(regex)).length > 1) {
            aData = aData.split(new RegExp(regex))
            for (let idx = 1; idx < aData.length; ++idx) {
                let data = aData[idx]
                // remove "(...)" of fooFoo.foo(...)
                if (data.includes('(') && data.includes(')')) {

                    // handling case: (req: Request, res: Response) => { return fooFoo.foo(req, res) }
                    if (data.split('(')[0].includes('{')) {
                        data = data.replace('{', ' ')
                        data = data.replace(' return ', ' ')
                        data = data.replace('}', ' ')
                    }

                    data = data.split(')')
                    const cleanedMethod = data[0].split('(')[0]
                    data[1] = cleanedMethod + ' ' + data[1]
                    data.shift()
                    data = data.join(')')
                    aData[idx] = data
                }
            }
            aData = aData.join(',')
        }
        return resolve(aData)
    })
}

/**
 * TODO: fill
 * @param {*} data 
 * @param {*} keepSwaggerTags 
 */
function removeComments(data, keepSwaggerTags = false) {
    return new Promise(async (resolve, reject) => {

        if (data.length == 0)
            return resolve(data)

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
            if (c == '/' && data[idx + 1] == '*' && stackComment1 == 0 && stackComment2 == 0 && isStr1 == 0 && isStr2 == 0)
                stackComment2 = 1
            if (c == '/' && data[idx - 1] == '*' && stackComment2 == 1 && isStr1 == 0 && isStr2 == 0)
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

/**
 * TODO: fill
 * @param {*} data 
 */
function getSwaggerComments(data) {
    return new Promise(async (resolve, reject) => {

        if (data.length == 0)
            return resolve(data)

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

            if (stackComment1 == 1 || stackComment1 == 2) { // Keeps the comment being ignored. Like: //
                buffer1 += c
            } else if (stackComment2 == 1 || stackComment2 == 2) { // Keeps the comment being ignored. Like: /* */
                buffer2 += c
            }

            if (stackComment1 == 2) {
                stackComment1 = 0
                if (buffer1.includes('#swagger.')) {
                    strToReturn += ' ' + buffer1  // keeping the comment that has a swagger tag
                    buffer1 = ''
                } else
                    buffer1 = ''
            }

            if (stackComment2 == 2) {
                stackComment2 = 0
                if (buffer2.includes('#swagger.')) {
                    strToReturn += ' ' + buffer2  // keeping the comment that has a swagger tag
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

/**
 * TODO: fill
 * @param {*} data 
 */
function removeStrings(data) {
    return new Promise((resolve, reject) => {

        if (data.length == 0)
            return resolve(data)

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

/**
 * TODO: fill
 * @param {*} data 
 * @param {*} keepParentheses 
 */
function removeInsideParentheses(data, keepParentheses = false) {
    return new Promise((resolve, reject) => {
        if (data.length == 0)
            return resolve(data)

        var strToReturn = ''
        var stack = 0;

        for (var idx = 0; idx < data.length; ++idx) {
            let c = data[idx]

            if (c == '(')
                stack += 1

            if (stack == 0)
                strToReturn += c

            if (c == ')') {
                stack -= 1
                if (stack == 0 && keepParentheses)
                    strToReturn += '()'
            }

            if (idx == data.length - 1) {
                return resolve(strToReturn)
            }
        }
    })
}

/**
 * TODO: fill
 * @param {*} data 
 * @param {*} patterns 
 */
function addReferenceToMethods(data, patterns) {
    return new Promise((resolve, reject) => {
        let auxData = data
        let routeEndpoints = []
        // CASE: router.route('/user').get(authorize, (req, res) => {
        let aDataRoute = auxData.split(new RegExp(`.*\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*route\\s*\\n*\\t*\\s*\\n*\\t*\\(`))
        if (aDataRoute.length > 1) {
            for (var idx = 1; idx < aDataRoute.length; ++idx) {
                // CASE: app.get([_[get]_])('/automatic1/users/:id', (req, res) => {
                for (var mIdx = 0; mIdx < statics.METHODS.length; ++mIdx) {
                    let method = statics.METHODS[mIdx]
                    let line = aDataRoute[idx].split(new RegExp(`\\)(\\s*|\\n*|\\t*)\\.\\s*\\n*\\t*\\s*\\n*\\t*${method}\\s*\\n*\\t*\\s*\\n*\\t*\\(`))
                    if (line.length === 3) {
                        line[0] = line[0].split(')')[0]
                        // TODO: refactor this
                        line[2] = line[2].split(new RegExp(
                            `\\)(\\s*|\\n*|\\t*)\\.\\s*\\n*\\t*\\s*\\n*\\t*get\\s*\\n*\\t*\\s*\\n*\\t*\\(|` +
                            `\\)(\\s*|\\n*|\\t*)\\.\\s*\\n*\\t*\\s*\\n*\\t*head\\s*\\n*\\t*\\s*\\n*\\t*\\(|` +
                            `\\)(\\s*|\\n*|\\t*)\\.\\s*\\n*\\t*\\s*\\n*\\t*post\\s*\\n*\\t*\\s*\\n*\\t*\\(|` +
                            `\\)(\\s*|\\n*|\\t*)\\.\\s*\\n*\\t*\\s*\\n*\\t*put\\s*\\n*\\t*\\s*\\n*\\t*\\(|` +
                            `\\)(\\s*|\\n*|\\t*)\\.\\s*\\n*\\t*\\s*\\n*\\t*delete\\s*\\n*\\t*\\s*\\n*\\t*\\(|` +
                            `\\)(\\s*|\\n*|\\t*)\\.\\s*\\n*\\t*\\s*\\n*\\t*patch\\s*\\n*\\t*\\s*\\n*\\t*\\(|` +
                            `\\)(\\s*|\\n*|\\t*)\\.\\s*\\n*\\t*\\s*\\n*\\t*options\\s*\\n*\\t*\\s*\\n*\\t*\\(`))[0]
                        routeEndpoints.push((patterns[0] || '_app') + `.${method}(` + line[0] + ',' + line[2])
                    }
                }
            }
            auxData = aDataRoute[0] + routeEndpoints.join('\n')
        }

        /**
         * CASE: router.get(...).post(...).put(...)...
         */
        let regexChainedEndpoint = ''
        for (let idxMethod = 0; idxMethod < statics.METHODS.length; ++idxMethod) {
            regexChainedEndpoint += `(\\)\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*${statics.METHODS[idxMethod]}\\s*\\n*\\t*\\s*\\n*\\t*\\()|`
        }
        regexChainedEndpoint = regexChainedEndpoint.replace(/\|$/, '')
        auxData = auxData.split(new RegExp(regexChainedEndpoint))
        auxData = auxData.filter(d => d)
        for (let idx = 1; idx < auxData.length; idx += 2) {
            if (auxData[idx + 1] && auxData[idx + 1].split("/*")[0].includes("*/"))    // Avoind modification in string of #swagger.description
                continue
            auxData[idx] = auxData[idx].replace(".", "____CHAINED____.")
        }
        auxData = auxData.join('')
        // END CASE

        let methods = [...statics.METHODS, 'use']
        for (var idx = 0; idx < methods.length; ++idx) {
            for (var idxPtn = 0; idxPtn < patterns.length; ++idxPtn) {
                let method = methods[idx]
                let pattern = patterns[idxPtn]
                let regexMethods = `${pattern}\\s*\\n*\\t*\\s*\\n*\\t*\\.\\s*\\n*\\t*\\s*\\n*\\t*${method}\\s*\\n*\\t*\\s*\\n*\\t*\\(`
                auxData = auxData.split(new RegExp(regexMethods))
                auxData = auxData.join((pattern || '_app') + `.${method}([_[${method}]_])([_[${pattern}]_])(`)
            }

            if (idx == methods.length - 1) {
                return resolve(auxData)
            }
        }
    })
}

/**
 * TODO: fill
 * @param {*} data 
 * @param {*} startSymbol 
 * @param {*} endSymbol 
 */
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

/**
 * TODO: fill
 * @param {*} data 
 * @param {*} startSymbol 
 * @param {*} endSymbol 
 */
function stack0SymbolRecognizer(data, startSymbol, endSymbol) {
    return new Promise((resolve) => {
        var stack = 0
        var rec = 0
        let strVect = []

        for (let idx = 0; idx < data.length; ++idx) {
            let c = data[idx]

            if (rec == 0 && c == startSymbol) rec = 1
            if (c == startSymbol && rec == 1) stack += 1
            if (c == endSymbol && rec == 1) stack -= 1
            if (stack == 0 && rec == 1) rec = 2

            if (rec == 1)
                strVect.push(c)

            if ((idx === data.length - 1 && rec == 1) || (idx === data.length - 1 && rec == 0))
                return resolve(null)

            if (idx === data.length - 1) {
                strVect = strVect.join('')
                return resolve(strVect.slice(1))
            }
        }
    })
}

/**
 * TODO: fill
 * @param {*} elem 
 * @param {*} request 
 * @param {*} objParameters 
 */
function getQueryIndirecty(elem, request, objParameters) {
    for (let idx = 0; idx < request.length; ++idx) {
        let req = request[idx]
        if (req && req.split(new RegExp("\\;|\\{|\\(|\\[|\\\"|\\\'|\\\`|\\}|\\)|\\]|\\:|\\,")).length == 1 && elem.split(new RegExp(" .*?\\s*\\t*\\s*\\t*=\\s*\\t*\\s*\\t*" + req + "\\.\\s*\\t*\\s*\\t*query(\\s|\\n|;|\\t)", "gmi").length > 1)) {
            let queryVars = []
            var aQuerys = elem.split(new RegExp("\\s*\\t*\\s*\\t*=\\s*\\t*\\s*\\t*" + req + "\\.\\s*\\t*\\s*\\t*query(\\s|\\n|;|\\t)", "i"))
            aQuerys = aQuerys.slice(0, -1)

            if (aQuerys.length > 0) {
                // get variables name
                for (let idx = 0; idx < aQuerys.length; idx++) {  // aQuerys.length -1
                    if (aQuerys[idx].replaceAll(' ', '') != '')
                        queryVars.push(aQuerys[idx].split(new RegExp("\\s*|\\t*")).slice(-1)[0])
                }
                if (queryVars.length > 0) {
                    queryVars.forEach(query => {
                        let varNames = elem.split(new RegExp(" " + query + "\\.")).splice(1)
                        varNames = varNames.map(v => v = v.split(new RegExp("\\s|;|\\n|\\t"))[0])
                        varNames.forEach(name => {
                            objParameters[name] = { name, in: 'query' }
                        })
                    })
                }
            }
        }
    }
    return objParameters
}

/**
 * TODO: fill
 * @param {*} elem 
 * @param {*} response 
 * @param {*} objResponses 
 */
function getStatus(elem, response, objResponses) {
    for (let idx = 0; idx < response.length; ++idx) {
        let res = response[idx]
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
    }
    return objResponses
}

/**
 * TODO: fill
 * @param {*} elem 
 * @param {*} path 
 * @param {*} method 
 * @param {*} response 
 * @param {*} objEndpoint 
 */
function getHeader(elem, path, method, response, objEndpoint) {
    for (let idx = 0; idx < response.length; ++idx) {
        let res = response[idx]
        if (res && (elem.replaceAll(' ', '').includes(res + '.setHeader('))) {
            elem = elem.replaceAll(' ', '')
            let aContentType = []
            elem.split(res + '.setHeader(').splice(1).forEach(s => {
                if (s.includes(',') && s.split(',')[0].includes('content-type'))
                    aContentType.push(s.split(',\"')[1].split('\")')[0])
            })
            objEndpoint[path][method].produces = aContentType
        }
    }
    return objEndpoint
}

/**
 * TODO: fill
 * @param {*} elem 
 * @param {*} request 
 * @param {*} objParameters 
 */
function getQuery(elem, request, objParameters) {
    for (let idx = 0; idx < request.length; ++idx) {
        let req = request[idx]
        if (req && (elem.split(req + '.query.').length > 1)) {
            elem.split(req + '.query.').splice(1).forEach(p => {
                let name = p.split(/\(|\)|\{|\}|\[|\]|\/|\\|\;|\:|\!|\@|\$|\#|\=|\?|\+|,|\||\&|\t|\n| /)[0].replaceAll(' ', '')
                if (name.includes('.'))
                    name = name.split('.')[0]
                if (!!objParameters[name] === false)    // Checks if the parameter name already exists
                    objParameters[name] = { name, in: 'query' }
                if (!objParameters[name].in)
                    objParameters[name].in = 'query'
            })
        }
    }
    return objParameters
}

/**
 * TODO: fill
 * @param {*} line 
 */
function getCallbackParameters(line) {
    return new Promise(async (resolve) => {

        let req = new Set()
        let res = new Set()
        let next = new Set()

        const regex = "\\=|\\{|\\}|\\(|\\)|\\[|\\]|\\!|\\,"

        var splitedParams = line.split(new RegExp("(\\(|\\))"))
        for (let idx = 0; idx < splitedParams.length; ++idx) {

            let pos = splitedParams[idx + 2] || ''

            if (pos !== '') {
                pos = await removeComments(pos)
                pos = await removeStrings(pos)
            }

            let arrowFunctionPos = pos.split(new RegExp(`(\\s*\\t*\\s*\\t*=>\\s*\\n*\\t*\\s*\\n*\\t*\\{)`))
            let arrowFunctionWithoutCurlyBracketPos = ['']
            let traditionalFunctionPos = ['']

            if (arrowFunctionPos.length == 1) {
                arrowFunctionWithoutCurlyBracketPos = pos.split(new RegExp(`(\\s*\\t*\\s*\\t*=>)`))
                if (arrowFunctionWithoutCurlyBracketPos.length == 1)
                    traditionalFunctionPos = pos.split(new RegExp(`(\\s*\\n*\\t*\\s*\\n*\\t*\\:?\\s*\\n*\\t*\\s*\\n*\\t*\\w*\\s*\\n*\\t*\\<?\\s*\\n*\\t*\\w*\\s*\\n*\\t*\\>?\\s*\\n*\\t*\\s*\\n*\\t*\\{)`))
            }

            let isFunction = false
            if (arrowFunctionPos.length > 1 || arrowFunctionWithoutCurlyBracketPos.length > 1 || traditionalFunctionPos.length > 1)
                isFunction = true

            if (
                isFunction &&
                (splitedParams[idx - 2] && splitedParams[idx - 2].split(new RegExp("\\s+if")).length === 1) &&
                (splitedParams[idx - 1] && splitedParams[idx - 1].trim() === '(') &&
                (splitedParams[idx + 1] && splitedParams[idx + 1].trim() === ')')
            ) {

                let params = splitedParams[idx]
                params = params.split(',')
                // Request
                if (params[0] && params[0].includes(':')) {     // TS
                    let typeParam = params[0].split(':')[1].toLocaleLowerCase()
                    let param = params[0].split(':')[0].replaceAll('\n', '').replaceAll('\t', '').replaceAll(' ', '')
                    if (typeParam.includes('res')) {
                        if (param.split(new RegExp(regex)).length === 1 && param && param.trim() !== '')
                            res.add(param)
                    } else if (typeParam.includes('req')) {
                        if (param.split(new RegExp(regex)).length === 1 && param && param.trim() !== '')
                            req.add(param)
                    } else if (typeParam.includes('next')) {
                        if (param.split(new RegExp(regex)).length === 1 && param && param.trim() !== '')
                            next.add(param)
                    } else {    // any
                        if (param.split(new RegExp(regex)).length === 1 && param && param.trim() !== '')
                            req.add(param)
                    }
                } else if (params[0]) {                         // JS
                    let param = params[0].replaceAll('\n', '').replaceAll('\t', '').replaceAll(' ', '')
                    if (param.split(new RegExp(regex)).length === 1 && param && param.trim() !== '')
                        req.add(param)
                }

                // Response
                if (params[1] && params[1].includes(':')) {     // TS
                    let typeParam = params[1].split(':')[1].toLocaleLowerCase()
                    let param = params[1].split(':')[0].replaceAll('\n', '').replaceAll('\t', '').replaceAll(' ', '')
                    if (typeParam.includes('res')) {
                        if (param.split(new RegExp(regex)).length === 1 && param && param.trim() !== '')
                            res.add(param)
                    } else if (typeParam.includes('req')) {
                        if (param.split(new RegExp(regex)).length === 1 && param && param.trim() !== '')
                            req.add(param)
                    } else if (typeParam.includes('next')) {
                        if (param.split(new RegExp(regex)).length === 1 && param && param.trim() !== '')
                            next.add(param)
                    } else {    // any
                        if (param.split(new RegExp(regex)).length === 1 && param && param.trim() !== '')
                            res.add(param)
                    }
                } else if (params[1]) {                         // JS
                    let param = params[1].replaceAll('\n', '').replaceAll('\t', '').replaceAll(' ', '')
                    if (param.split(new RegExp(regex)).length === 1 && param && param.trim() !== '')
                        res.add(param)
                }

                // Next middleware
                if (params[2] && params[2].includes(':')) {     // TS
                    let typeParam = params[2].split(':')[1].toLocaleLowerCase()
                    let param = params[2].split(':')[0].replaceAll('\n', '').replaceAll('\t', '').replaceAll(' ', '')
                    if (typeParam.includes('res')) {
                        if (param.split(new RegExp(regex)).length === 1 && param && param.trim() !== '')
                            res.add(param)
                    } else if (typeParam.includes('req')) {
                        if (param.split(new RegExp(regex)).length === 1 && param && param.trim() !== '')
                            req.add(param)
                    } else if (typeParam.includes('next')) {
                        if (param.split(new RegExp(regex)).length === 1 && param && param.trim() !== '')
                            next.add(param)
                    } else {    // any
                        if (param.split(new RegExp(regex)).length === 1 && param && param.trim() !== '')
                            next.add(param)
                    }
                } else if (params[2]) {                         // JS
                    let param = params[2].replaceAll('\n', '').replaceAll('\t', '').replaceAll(' ', '')
                    if (param.split(new RegExp(regex)).length === 1 && param && param.trim() !== '')
                        next.add(param)
                }
            }
        }
        return resolve({ req: [...req], res: [...res], next: [...next] })
    })
}

/**
 * TODO: fill
 * @param {*} path 
 * @param {*} objParameters 
 */
function getPathParameters(path, objParameters) {
    return new Promise(async (resolve) => {
        if (path.split('{').length > 1) {
            var name = ' '
            var cnt = 0
            while (path.includes('{')) {
                name = await stack0SymbolRecognizer(path, '{', '}')
                path = path.split('{' + name + '}')
                path = path.join('')

                if (!!objParameters[name] === false)    // Checks if the parameter name already exists
                    objParameters[name] = { name, in: 'path', required: true, type: 'string' }  // by deafult 'type' is 'string'

                cnt += 1
                if (cnt > 10)   // Avoiding infinite loop
                    return resolve(objParameters)
            }
            return resolve(objParameters)
        } else
            return resolve(objParameters)
    })
}

/**
 * TODO: fill
 * @param {*} data 
 * @param {*} refFuncao 
 */
async function functionRecognizerInData(data, refFuncao) {
    return new Promise(async (resolve, reject) => {
        var func = null
        refFuncao = refFuncao.split(new RegExp("\\;|\\{|\\(|\\[|\\\"|\\\'|\\\`|\\}|\\)|\\]|\\:|\\,|\\*"))
        if (refFuncao.length > 1)
            refFuncao = refFuncao[1]
        else
            refFuncao = refFuncao[0]

        if (refFuncao == '')
            return resolve(null)

        data = data.replaceAll(' function ', ' ')
        var arrowFunction = data.split(new RegExp(`(${refFuncao}\\s*\\n*\\t*\\s*\\n*\\t*\\:?\\s*\\n*\\t*\\s*\\n*\\t*\\w*\\s*\\n*\\t*\\s*\\n*\\t*\\=\\s*\\n*\\t*\\s*\\n*\\t*\\([\\s\\S]*\\)\\s*\\t*\\s*\\t*=>\\s*\\n*\\t*\\s*\\n*\\t*\\{)`))
        var arrowFunctionWithoutCurlyBracket = ['']
        var traditionalFunction = ['']

        if (arrowFunction.length == 1) {
            arrowFunctionWithoutCurlyBracket = data.split(new RegExp(`(${refFuncao}\\s*\\n*\\t*\\s*\\n*\\t*\\:?\\s*\\n*\\t*\\s*\\n*\\t*\\w*\\s*\\n*\\t*\\s*\\n*\\t*\\=\\s*\\n*\\t*\\s*\\n*\\t*\\([\\s\\S]*\\)\\s*\\t*\\s*\\t*=>)`))
            if (arrowFunctionWithoutCurlyBracket.length == 1)
                traditionalFunction = data.split(new RegExp(`(${refFuncao}\\s*\\n*\\t*\\s*\\n*\\t*\\:?\\s*\\n*\\t*\\s*\\n*\\t*\\=?\\s*\\n*\\t*\\s*\\n*\\t*\\([\\s\\S]*\\)\\s*\\n*\\t*\\s*\\n*\\t*\\:?\\s*\\n*\\t*\\s*\\n*\\t*\\w*\\s*\\n*\\t*\\<?\\s*\\n*\\t*\\w*\\s*\\n*\\t*\\>?\\s*\\n*\\t*\\s*\\n*\\t*\\{)`))
        }

        var isArrowFunction = false
        var isArrowFunctionWithoutCurlyBracket = false
        var isTraditionalFunction = false

        if (arrowFunction.length > 1) {
            func = arrowFunction
            isArrowFunction = true
        } else if (arrowFunctionWithoutCurlyBracket.length > 1) {
            func = arrowFunctionWithoutCurlyBracket
            isArrowFunctionWithoutCurlyBracket = true
        } else if (traditionalFunction.length > 1) {
            func = traditionalFunction
            isTraditionalFunction = true
        }

        if (func && func.length > 1) {
            func.shift()
            func = func.join(' ')
        }

        if (func && func.length > 1) {
            if (isArrowFunctionWithoutCurlyBracket) { // CASE: arrow funciton without {, for example: func => func(...);
                var funcStr = func
                funcStr = funcStr.split('=>')[0]
                if (funcStr.includes('='))
                    funcStr = funcStr.split('=')[1]
                funcStr = funcStr + '=> {'
                var arrowFunc = func.split('=>')[1].trimLeft()
                arrowFunc = arrowFunc.split(new RegExp("\\n|\\s|\\t|\\;"))
                for (let idx = 0; idx < arrowFunc.length; idx++) {
                    if (arrowFunc[idx] != '') {
                        let strRet = (funcStr + arrowFunc[idx] + '}')
                        return resolve(strRet)
                    } if (idx == arrowFunc.length - 1)
                        return resolve(null)
                }
            } else if (isArrowFunction || isTraditionalFunction) {
                func = func.split('{')
                func.shift()
                func = func.join('{')
                var funcStr = null
                if (isArrowFunction)
                    funcStr = data.split(new RegExp(`${refFuncao}\\s*\\n*\\t*\\s*\\n*\\t*\\:?\\s*\\n*\\t*\\s*\\n*\\t*\\w*\\s*\\n*\\t*\\s*\\n*\\t*\\=\\s*\\n*\\t*\\s*\\n*\\t*\\(`))[1]
                else if (isTraditionalFunction)
                    funcStr = data.split(new RegExp(`${refFuncao}\\s*\\n*\\t*\\s*\\n*\\t*\\:?\\s*\\n*\\t*\\s*\\n*\\t*\\=?\\s*\\n*\\t*\\s*\\n*\\t*\\(`))[1]

                if (funcStr && funcStr.split('}').length > 1)
                    funcStr = funcStr.split('{')[0]
                funcStr = '(' + funcStr + (isArrowFunction ? ' { ' : ' => { ')    // TODO: Verify case 'funcStr' with '=> =>'
                let finalFunc = await stackSymbolRecognizer(func, '{', '}')
                return resolve(funcStr + finalFunc)

            } else
                return resolve(null)
        } else
            return resolve(null)
    })
}

/**
 * Get first function of string
 * @param {*} functionArray 
 */
function popFunction(functionArray) {
    return new Promise(async (resolve) => {
        var arrowFunction = functionArray.split(new RegExp(`(\\s*\\n*\\t*\\s*\\n*\\t*\\([\\s\\S]*\\)\\s*\\t*\\s*\\t*=>\\s*\\n*\\t*\\s*\\n*\\t*\\{)`))  // arrow function with '{' and '}'
        var arrowFunctionWithoutCurlyBracket = ['']
        var traditionalFunction = ['']

        if (arrowFunction.length == 1) {
            arrowFunctionWithoutCurlyBracket = functionArray.split(new RegExp(`(\\s*\\n*\\t*\\s*\\n*\\t*\\([\\s\\S]*\\)\\s*\\t*\\s*\\t*=>)`))     // arrow function without '{' and '}'
            if (arrowFunctionWithoutCurlyBracket.length == 1)
                traditionalFunction = functionArray.split(new RegExp(`(\\s*\\n*\\t*\\s*\\n*\\t*\\([\\s\\S]*\\)\\s*\\n*\\t*\\s*\\n*\\t*\\:?\\s*\\n*\\t*\\s*\\n*\\t*\\w*\\s*\\n*\\t*\\<?\\s*\\n*\\t*\\w*\\s*\\n*\\t*\\>?\\s*\\n*\\t*\\s*\\n*\\t*\\{)`)) // traditional function with '{' and '}'
        }

        let isArrowFunction = false
        let isArrowFunctionWithoutCurlyBracket = false
        let isTraditionalFunction = false

        if (arrowFunction.length > 1) {
            isArrowFunction = true
        } else if (arrowFunctionWithoutCurlyBracket.length > 1) {
            isArrowFunctionWithoutCurlyBracket = true
        } else if (traditionalFunction.length > 1) {
            isTraditionalFunction = true
        }

        if (isArrowFunction || isTraditionalFunction) {
            let signatureFunc = ''
            let func = functionArray.split('{')
            let params = func[0]
            params = params.split('').reverse().join('')
            params = await stack0SymbolRecognizer(params, ')', '(')
            if (params)
                params = '(' + params.split('').reverse().join('') + ')'
            // TODO: verify case without '(' and ')'
            signatureFunc = params + func[0].split(params)[1] + '{'
            func.shift()
            func = func.join('{')
            func = signatureFunc + await stackSymbolRecognizer(func, '{', '}')
            return resolve(func.trim())
        } else if (isArrowFunctionWithoutCurlyBracket) {
            let func = functionArray.split('=>')[1].trimLeft()
            func = func.split(new RegExp("\\n|\\s|\\t|\\;"))[0]
            func = functionArray.split(func)[0] + func
            return resolve(func)
        } else
            return resolve(null)
    })
}

/**
 * Get first string
 * @param {*} data 
 */
function popString(data) {
    return new Promise(async (resolve) => {
        data = data.replaceAll("\\\"", statics.STRING_BREAKER + "_quote1_" + statics.STRING_BREAKER)
        data = data.replaceAll("\\\'", statics.STRING_BREAKER + "_quote2_" + statics.STRING_BREAKER)
        data = data.replaceAll("\\\`", statics.STRING_BREAKER + "_quote3_" + statics.STRING_BREAKER)
        data = data.replaceAll("\'", "\"")
        data = data.replaceAll("\`", "\"")
        data = data.split("\"")

        if (data.length > 1) {
            let str = data[1]
            str = str.replaceAll(statics.STRING_BREAKER + "_quote1_" + statics.STRING_BREAKER, "\\\"")
            str = str.replaceAll(statics.STRING_BREAKER + "_quote2_" + statics.STRING_BREAKER, "\\\'")
            str = str.replaceAll(statics.STRING_BREAKER + "_quote3_" + statics.STRING_BREAKER, "\\\`")
            return resolve(data[1])
        }
        return resolve(null)
    })
}


module.exports = {
    clearData,
    removeComments,
    removeStrings,
    addReferenceToMethods,
    stack0SymbolRecognizer,
    stackSymbolRecognizer,
    getQueryIndirecty,
    getStatus,
    getHeader,
    getQuery,
    getCallbackParameters,
    getPathParameters,
    functionRecognizerInData,
    popFunction,
    getSwaggerComments,
    popString,
    removeInsideParentheses
}