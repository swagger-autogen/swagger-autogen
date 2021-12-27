
const tape = require('tape')
const _test = require('tape-promise').default
const test = _test(tape)
const handleData = require('../src/handle-data')

/**
 * Unitary tests
 */

test('\nUnitary tests [removeInsideParentheses(...)]:', async (t) => { 

  let resp = await handleData.removeInsideParentheses(`text text "Some text..." text text ( to remove ) text (remove(text) too)text`)
  t.deepEqual(resp, "text text \"Some text...\" text text  text text", '[removeInsideParentheses(...)] 001')

  resp = await handleData.removeInsideParentheses(`text ( to remove "regex".split(/\\)/) ) text (remove(text) too)text`)
  t.deepEqual(resp, "text  text text", '[removeInsideParentheses(...)] 003')

  resp = await handleData.removeInsideParentheses(`( to remove ) text (remove(text) too)`)
  t.deepEqual(resp, " text ", '[removeInsideParentheses(...)] 002')

  resp = await handleData.removeInsideParentheses(`( to remove "regex".split(/\\)/) ) text (remove(text) too)`)
  t.deepEqual(resp, " text ", '[removeInsideParentheses(...)] 004')

  resp = await handleData.removeInsideParentheses(`( to remove "regex".split(/()))))/) remove??? ) text (remove(remove) remove) text`)
  t.deepEqual(resp, "))/) remove??? ) text  text", '[removeInsideParentheses(...)] 005')

  resp = await handleData.removeInsideParentheses(`router.post(, validateAuthRoutes.validateUserLogin, async ctx => {
    ctx.throw(404, null, {
    });
    exp: Math.floor(Date.now() / 123) // comment
    ctx.log.error(, ctx.request.ip, ctx.path);
    ctx.throw(404, null, {
    });
   });
   async function verifyEmail(email) {`, true)
  t.deepEqual(resp, `router.post();\n   async function verifyEmail() {`, '[removeInsideParentheses(...)] 006')
  
  t.end()
  
})

test('Unitary tests [removeComments(...)]:', async (t) => { 

  let resp = await handleData.removeComments(`text text "Some text..." text text // to remove`)
  t.deepEqual(resp, "text text \"Some text...\" text text ", '[removeComments(...)] 001')

  resp = await handleData.removeComments(`text text "Some text..." text text //to remove//to remove`)
  t.deepEqual(resp, "text text \"Some text...\" text text ", '[removeComments(...)] 002')

  resp = await handleData.removeComments(`//to remove//to remove`)
  t.deepEqual(resp, "", '[removeComments(...)] 003')

  resp = await handleData.removeComments(`text//to remove*/to remove`)
  t.deepEqual(resp, "text", '[removeComments(...)] 004')

  resp = await handleData.removeComments(`text//to /*remove*/to remove`)
  t.deepEqual(resp, "text", '[removeComments(...)] 005')

  resp = await handleData.removeComments(`text text /*to remove*/ text text`)
  t.deepEqual(resp, "text text text text", '[removeComments(...)] 006')

  resp = await handleData.removeComments(`text text /* // to remove */ text text`)
  t.deepEqual(resp, "text text text text", '[removeComments(...)] 007')

  resp = await handleData.removeComments(`text text /* /* to remove  */ text text`)
  t.deepEqual(resp, "text text text text", '[removeComments(...)] 008')

  resp = await handleData.removeComments(`text text /*/  to remove   /*/ text text`)
  t.deepEqual(resp, "text text text text", '[removeComments(...)] 009')

  resp = await handleData.removeComments(`text text "/*/" text text`)
  t.deepEqual(resp, "text text \"/*/\" text text", '[removeComments(...)] 010')

  resp = await handleData.removeComments(`text text /**/ text text`)
  t.deepEqual(resp, "text text text text", '[removeComments(...)] 011')

  resp = await handleData.removeComments(`text text .split(/\\/*|something/) keep this " /* keep ".split(/\\*/); text text`)
  t.deepEqual(resp, "text text .split(/\\/*|something/) keep this \" /* keep \".split(/\\*/); text text", '[removeComments(...)] 012')

  resp = await handleData.removeComments(`/*to remove*/`)
  t.deepEqual(resp, "", '[removeComments(...)] 013')

  resp = await handleData.removeComments(`/*to remove*/ text`)
  t.deepEqual(resp, " text", '[removeComments(...)] 014')

  resp = await handleData.removeComments(`/* // to remove */`)
  t.deepEqual(resp, "", '[removeComments(...)] 015')

  resp = await handleData.removeComments(`/* // to remove */ text`)
  t.deepEqual(resp, " text", '[removeComments(...)] 016')

  resp = await handleData.removeComments(`/* /* to remove  */`)
  t.deepEqual(resp, "", '[removeComments(...)] 017')

  resp = await handleData.removeComments(`/* /* to remove  */ text`)
  t.deepEqual(resp, " text", '[removeComments(...)] 018')

  resp = await handleData.removeComments(`/*/  to remove   /*/`)
  t.deepEqual(resp, "", '[removeComments(...)] 019')

  resp = await handleData.removeComments(`/*/  to remove   /*/ text`)
  t.deepEqual(resp, " text", '[removeComments(...)] 020')

  resp = await handleData.removeComments(`"/*/" text text`)
  t.deepEqual(resp, "\"/*/\" text text", '[removeComments(...)] 021')

  resp = await handleData.removeComments(`/**/`)
  t.deepEqual(resp, "", '[removeComments(...)] 022')

  resp = await handleData.removeComments(`\\/*|something/) keep this`)
  t.deepEqual(resp, "\\/*|something/) keep this", '[removeComments(...)] 023')

  resp = await handleData.removeComments(`text /* remove .split(/\\*("|'|\`)[* /]/) */ text`)
  t.deepEqual(resp, `text text`, '[removeComments(...)] 024')

  resp = await handleData.removeComments(`text1 
    text2 /*remove */
    text3 // remove "keep" remove
    text4`)
  t.deepEqual(resp, `text1 \n text2 \n text3 text4`, '[removeComments(...)] 025')

  t.end()
  
})

test('Unitary tests [removeStrings(...)]:', async (t) => { 

  let resp = await handleData.removeStrings(`text text "To remove..." text text // text "to keep"`)
  t.deepEqual(resp, `text text text text // text "to keep"`, '[removeStrings(...)] 001')

  resp = await handleData.removeStrings(`text text "To \\"remove..." text text // text "to keep"`)
  t.deepEqual(resp, `text text text text // text "to keep"`, '[removeStrings(...)] 002')

  resp = await handleData.removeStrings(`text text "To 'remove..." text text // text "to keep"`)
  t.deepEqual(resp, `text text text text // text "to keep"`, '[removeStrings(...)] 003')

  resp = await handleData.removeStrings(`text text '"To remove'keep...'" to remove 'text // text "to keep"`)
  t.deepEqual(resp, `text text keep...text // text "to keep"`, '[removeStrings(...)] 004')

  resp = await handleData.removeStrings("text text `to remove` text")
  t.deepEqual(resp, "text text text", '[removeStrings(...)] 005')

  resp = await handleData.removeStrings(`text text '' text`)
  t.deepEqual(resp, "text text text", '[removeStrings(...)] 006')

  resp = await handleData.removeStrings(`text text "" text`)
  t.deepEqual(resp, "text text text", '[removeStrings(...)] 007')
  
  resp = await handleData.removeStrings("text text `` text")
  t.deepEqual(resp, "text text text", '[removeStrings(...)] 008')

  resp = await handleData.removeStrings(`text "regex".split(/"/) text`)
  t.deepEqual(resp, "text .split(/\"/) text", '[removeStrings(...)] 009')

  resp = await handleData.removeStrings(`"To remove..."`)
  t.deepEqual(resp, "", '[removeStrings(...)] 010')

  resp = await handleData.removeStrings(`"To remove..." text`)
  t.deepEqual(resp, " text", '[removeStrings(...)] 011')

  resp = await handleData.removeStrings(`"To 'remove..."`)
  t.deepEqual(resp, "", '[removeStrings(...)] 012')

  resp = await handleData.removeStrings(`'"To remove'keep...'"'"to remove"`)
  t.deepEqual(resp, "keep...", '[removeStrings(...)] 013')

  resp = await handleData.removeStrings(`"To remove'keep...""to remove"`)
  t.deepEqual(resp, "", '[removeStrings(...)] 014')

  resp = await handleData.removeStrings("`to remove`")
  t.deepEqual(resp, "", '[removeStrings(...)] 015')

  resp = await handleData.removeStrings(`""""''\`\``)
  t.deepEqual(resp, "", '[removeStrings(...)] 016')
  
  resp = await handleData.removeStrings("\"\"")
  t.deepEqual(resp, "", '[removeStrings(...)] 017')

  resp = await handleData.removeStrings(`text /* keep " keep */ " remove " text`)
  t.deepEqual(resp, `text /* keep " keep */ text`, '[removeStrings(...)] 018')

  resp = await handleData.removeStrings(`text " remove /* remove ' remove */ remove " text`)
  t.deepEqual(resp, `text text`, '[removeStrings(...)] 019')

  resp = await handleData.removeStrings(`text "remove".split(/\\*("|'|\`)[*/]/) "'rem'ove'""remove"text`)
  t.deepEqual(resp, `text .split(/\\*("|'|\`)[*/]/) text`, '[removeStrings(...)] 020')

  resp = await handleData.removeStrings(`text1 // keep "keep"
  text2 "remove" text3
  `)
  t.deepEqual(resp, `text1 // keep "keep"\n text2 text3\n `, '[removeStrings(...)] 021')

  resp = await handleData.removeStrings(`
Math.floor1(/\\*("|'|\\/)[*/]/)
    exp: Math.floor(Date.now() / 123) // text "keep" text
  Math.floor2(/\\*("|'|\\/)[*/]/)
  textFinal1 "remove" textFinal2
Math.floor3(/\\*("|')[*/]/)
textFinal3 "remove" textFinal4
  `)
  t.deepEqual(resp, `\nMath.floor1(/\\*("|'|\\/)[*/]/)\n exp: Math.floor(Date.now() / 123) // text "keep" text\n Math.floor2(/\\*("|'|\\/)[*/]/)\n textFinal1 textFinal2\nMath.floor3(/\\*("|')[*/]/)\ntextFinal3 textFinal4\n `, '[removeStrings(...)] 022')

  t.end()
  
})
