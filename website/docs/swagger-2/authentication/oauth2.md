---
id: oauth2
title: OAuth2
sidebar_position: 2
---

The security example below was taken from the original Swagger documentation.

```js
const doc = {
  ...
  securityDefinitions: {
    oAuthSample: {
      type: 'oauth2',
      authorizationUrl: 'https://petstore.swagger.io/oauth/authorize',
      flow: 'implicit',
      scopes: {
        read_pets: 'read your pets',
        write_pets: 'modify pets in your account'
      }
    }
  }
};
```

To see more about the properties of the `doc` object, see the [Advanced Usage](/docs/getting-started/advanced-usage) section.

In the endpoint, add the `#swagger.security`, for example:
 
```js title="Example"
app.get('/path', (req, res) => {
    ...
    /* #swagger.security = [{
        "oAuthSample": [
            "write_pets",
            "read_pets"
        ]
    }] */
    ...
});
```

**NOTE:** To assign security to an entire route, see the [Property Inheritance](/docs/endpoints/property-inheritance) section.
