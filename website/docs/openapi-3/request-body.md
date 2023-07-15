---
id: request-body
title: Request Body
sidebar_position: 3
---

Use the `#swagger.requestBody` to impletent [Request Body](https://swagger.io/docs/specification/describing-request-body/).

```js title="Example #1"
app.post('/path', (req, res) => {
    ...
    /*	#swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/someSchema"
                    }  
                }
            }
        } 
    */
    ...
});
```

```js title="Example #2 (without declaring the content)"
app.post('/path', (req, res) => {
    ...
    /*	#swagger.requestBody = {
            required: true,
            schema: { $ref: "#/components/schemas/someSchema" }
    } */
    ...
});
```

**NOTE:** The body *content* in the **Example #2** will be generated automatically with `application/json` and `application/xml`.
