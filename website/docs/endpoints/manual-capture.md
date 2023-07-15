---
id: manual-capture
title: Manual capture
sidebar_position: 11
---

```mdx-code-block
<div style={{textAlign: 'justify'}}>

Use the `#swagger.auto = false` to disable automatic recognition. With that, all parameters of the endpoint must be informed manually, for example:

</div>
```

```js title="Example #1 (Swagger 2.0)"
app.put('/users/:id', (req, res) => {
...
    /*  #swagger.auto = false

        #swagger.path = '/users/{id}'
        #swagger.method = 'put'
        #swagger.produces = ['application/json']
        #swagger.consumes = ['application/json']

        #swagger.parameters['id'] = {
            in: 'path',
            description: 'User ID.',
            required: true,
            type: 'integer'
        }

        #swagger.parameters['body'] = {
            in: 'body',
            description: 'User data.',
            required: true,
            schema: {
                username: "user",
                password: "1234"
            }
        }
    */
    ...
    if(...) {
        // #swagger.responses[201] = { description: 'User registered successfully.' }
        return res.status(201).send(data);
    }
    ...
    // #swagger.responses[500] = { description: 'Server failure.'}
    return res.status(500).send(false);
});
```
