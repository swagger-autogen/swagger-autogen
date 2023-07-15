---
id: x-of
title: oneOf and anyOf
sidebar_position: 6
---

```mdx-code-block
<div style={{textAlign: 'justify'}}>

This section show how to use **oneOf** and **anyOf**. [See more about it here](https://swagger.io/docs/specification/data-models/oneof-anyof-allof-not)

</div>
```

```js title="Example #1 (oneOf)"
app.get('/path', (req, res) => {
    ...
    /* #swagger.requestBody = {
              required: true,
              content: {
                "application/json": {
                    schema:{
                        oneOf: [
                            {
                                $ref: "#/definitions/SomeSchema1",
                            },
                            {
                                $ref: "#/definitions/SomeSchema2"
                            }
                        ]
                    }
                }           
            }
          }
    */
   ...
});
```

```js title="Example #2 (anyOf)"
app.get('/path', (req, res) => {
    ...
    /* #swagger.requestBody = {
              required: true,
              content: {
                "application/json": {
                    schema:{
                        anyOf: [
                            {
                                $ref: "#/definitions/SomeSchema1",
                            },
                            {
                                $ref: "#/definitions/SomeSchema2"
                            }
                        ]
                    }
                }           
            }
          }
    */
   ...
});
```
