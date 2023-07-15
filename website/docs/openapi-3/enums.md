---
id: enums
title: Enums
sidebar_position: 5
---

```mdx-code-block
<div style={{textAlign: 'justify'}}>

You can use the `'@enum'` reserved keyword to specify possible values of a request parameter or a model property.  [See more about it here](https://swagger.io/docs/specification/data-models/enums).

</div>
```

```js title="Example #1"
app.get('/path', (req, res) => {
    ...
    /*  #swagger.parameters['any_name'] = {
            in: 'query',
            description: 'Some description...',
            schema: {
                '@enum': ['arc', 'desc']
            }
    } */
   ...
});
```

```js title="Example #2 (reusable)"
const doc = {
    ...
    components: {
        schemas: {
            Color: {
                '@enum': [
                    "black",
                    "white",
                    "red",
                    "green"
                ]
            }
        }
    }
};
```

```js
app.get('/path', (req, res) => {
    ...
    /*  #swagger.parameters['any_name'] = {
            in: 'query',
            description: 'Some description...',
            schema: {
                $ref: '#/components/schemas/Color'
            }
    } */
   ...
});
```
