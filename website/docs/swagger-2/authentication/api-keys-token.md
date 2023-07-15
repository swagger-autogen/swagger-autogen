---
id: api-keys-token
title: API Keys (Token)
sidebar_position: 1
---

The security example below was taken from the original Swagger documentation.

```js
const doc = {
  ...
  securityDefinitions: {
    apiKeyAuth: {
      type: 'apiKey',
      in: 'header', // can be 'header', 'query' or 'cookie'
      name: 'X-API-KEY', // name of the header, query parameter or cookie
      description: 'Some description...'
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
            "apiKeyAuth": []
    }] */
    ...
});
```

**NOTE:** To assign security to an entire route, see the [Property Inheritance](/docs/endpoints/property-inheritance) section.
