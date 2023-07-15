---
id: endpoint-as-deprecated
title: Endpoint as deprecated
sidebar_position: 8
---

Use the `#swagger.deprecated = true` to inform that a given endpoint is depreciated, for example:

```js
app.get('/path', (req, res) => {
    ...
    // #swagger.deprecated = true
    ...
});
```

**NOTE:** By default is *false*.
