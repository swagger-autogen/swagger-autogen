---
id: oauth2
title: OAuth2
sidebar_position: 2
---

The security example below was taken from the original Swagger documentation.

```js
const doc = {
    ...
    components: {
        securitySchemes:{
            OAuth2: {
                type: 'oauth2',
                flows: {
                    authorizationCode: {
                        authorizationUrl: 'https://example.com/oauth/authorize',
                        tokenUrl: 'https://example.com/oauth/token',
                        scopes: {
                            read: 'Grants read access',
                            write: 'Grants write access',
                            admin: 'Grants access to admin operations'
                        }
                    }
                }
            }
        }
    }
};
```

To see more about the properties of the `doc` object, see the [Advanced Usage](/docs/getting-started/advanced-usage#openapi-3x) section.

At the endpoint, add the `#swagger.security` tag, for example:

**Example endpoint:**  
```js
app.get('/path', (req, res) => {
    ...
    /* #swagger.security = [{
            "OAuth2": [
                'read', 
                'write'
            ]
    }] */
    ...
});
```