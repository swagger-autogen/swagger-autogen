---
id: bearer-auth
title: Bearer Auth
sidebar_position: 1
---

The security example below was taken from the original Swagger documentation.

```js
const doc = {
    ...
    components: {
        securitySchemes:{
            bearerAuth: {
                type: 'http',
                scheme: 'bearer'
            }
        }
    }
};
```

To see more about the properties of the `doc` object, see the [Advanced Usage](/docs/getting-started/advanced-usage#openapi-3x) section.

At the endpoint, add the `#swagger.security`, for example:

```js
app.get('/path', (req, res) => {
    ...
    /* #swagger.security = [{
            "bearerAuth": []
    }] */
    ...
});
```