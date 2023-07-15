---
id: responses
title: Responses
sidebar_position: 3
---

```mdx-code-block
<div style={{textAlign: 'justify'}}>

It is possible to create or complement automatically detected responses. Use the `#swagger.reponses[statusCode]` to create a new response or to complete an existing response (automatically detected).

</div>
```

All parameters:

```js
/* #swagger.responses[<number>] = {
        description: <string>,
        schema: <array>, <object>, <string>, <number> or <boolean>
} */
```

**description:** The parameter description.  
**schema:** See section [Schemas and Definitions](/docs/swagger-2/schemas-and-definitions)

### Examples  

```js title="Example #1"
app.get('/path', (req, res, next) => {
    ...
    // #swagger.responses[500] = { description: 'Some description...' }
    return res.status(500);
    ...
});
```

```js title="Example #2"
app.get('/path', (req, res, next) => {
    ...
    /* #swagger.responses[200] = {
            description: 'Some description...',
            schema: { $ref: '#/definitions/someDefinition' }
    } */
   return res.status(200).send(data);
   ...
});
```

```js title="Example #3"
app.get('/path', (req, res, next) => {
    ...
    /* #swagger.responses[200] = {
            description: 'Some description...',
            schema: {
                name: 'John Doe',
                age: 29,
                about: ''
            }
    } */
   return res.status(200).send(data);
   ...
});
```

For more information about **schema** and **definitions**, see the section [Schemas and Definitions](/docs/swagger-2/schemas-and-definitions)  
