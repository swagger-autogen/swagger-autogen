---
id: tags
title: Tags
sidebar_position: 1
---

To inform which tags the endpoints belong to, use the `#swagger.tags`, for example:

```js
app.get('/path', (req, res) => {
    ...
    // #swagger.tags = ['Users']
    ...
});
```
