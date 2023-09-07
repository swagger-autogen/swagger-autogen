---
id: responses
title: Responses
sidebar_position: 4
---

```mdx-code-block
<div style={{textAlign: 'justify'}}>

It is possible to create or complement automatically detected responses. Use the `#swagger.reponses[statusCode]` to create a new response or to complete an existing response (automatically detected).

</div>
```

All optional parameters:

```js
/* #swagger.responses[<number>] = {
        description:              <string>,
        content:
            "<content-type>"      application/json, application/xml, etc
                schema:           <object> or <Array>
} */
```

**description:** The parameter description.  
**schema:** See section [Schemas and Components](/docs/openapi-3/schemas-and-components)

```js title="Example #1"
app.get('/path', (req, res, next) => {
    ...
    /* #swagger.responses[200] = {
            description: "Some description...",
            content: {
                "application/json": {
                    schema:{
                        $ref: "#/components/schemas/User"
                    }
                }           
            }
        }   
    */
   ...
})
```

```js title="Example #2 (without declaring the content)"
app.post('/path', (req, res) => {
    ...
    /* #swagger.responses[200] = {
            description: 'Some description...',
            schema: { $ref: '#/components/schemas/someSchema' }
    } */
    ...
});
```

**NOTE:** The response *content* in the **Example #2** will be generated automatically with `application/json` and `application/xml`.

For more information about **schema**, see the section [Schemas and Components](/docs/openapi-3/schemas-and-components)  
