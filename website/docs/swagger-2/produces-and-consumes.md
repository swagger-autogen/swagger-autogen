---
id: produces-and-consumes
title: Produces and Consumes 
sidebar_position: 4
---

```mdx-code-block
<div style={{textAlign: 'justify'}}>

Use the `#swagger.produces` or `#swagger.consumes` to add a new produce or a new consume, respectively.

</div>
```

### Produces example

```js title="Example #1"
app.get('/path', (req, res) => {
    ...
    // #swagger.produces = ['application/json']
    ...
});
```

### Consumes example

In the examples below, the two endpoints will have the same result in the documentation.

```js title="Example #2"
app.get('/path', (req, res) => {
    ...
    // Recognizes the 'consumes' automatically
    res.setHeader('Content-Type', 'application/json');
    ...
});
```

```js title="Example #3"
app.get('/path', (req, res) => {
    ...
    // #swagger.consumes = ['application/json']
    ...
});
```
