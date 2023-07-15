---
id: operation-id
title: Operation ID
sidebar_position: 4
---

This is the operationId of the Endpoint. To add it, use the `#swagger.operationId`, for example:

```js
app.get('/path', (req, res) => {
    ...
    // #swagger.operationId = 'Your_operationId_here'
    ...
});
```
