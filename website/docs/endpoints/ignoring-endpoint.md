---
id: ignoring-endpoint
title: Ignoring endpoint
sidebar_position: 9
---

Use the `#swagger.ignore = true` to ignore a specific endpoint. Thus, it will not appear in the documentation, for example:

```js
app.get('/path', (req, res) => {
    ...
    // #swagger.ignore = true
    ...
});
```

**NOTE:** By default is *false*.
