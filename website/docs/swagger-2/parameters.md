---
id: parameters
title: Parameters
sidebar_position: 2
---

```mdx-code-block
<div style={{textAlign: 'justify'}}>

It is possible to add parameters or complement automatically detected parameters such as *path*, *header*, *query* and *body*. Use the `#swagger.parameters['parameterName']` to create a new parameter or to complete an existing parameter (automatically detected).

</div>
```

All optional parameters:

```js
/* #swagger.parameters['parameterName'] = {
        in: <string>,                            
        description: <string>,                   
        required: <boolean>,                     
        type: <string>,                          
        format: <string>,                        
        schema: <array>, <object> or <string>    
} */
```

**in:** *path*, *header*, *query*, *body*, *formData*, etc.    (By default is *query*)  
**description:** The parameter description.                    (By default is empty)  
**required:** true or false                                    (By default is *false*, except the *path* parameter)  
**type:** *boolean*, *number*, *integer*, *string* or *array*. (By default is *string* when 'schema' is missing)  
**format:** *int64*, etc.                                      (By default is null)  
**schema:** See section [Schemas and Definitions](/docs/swagger-2/schemas-and-definitions)  

### Examples

```js title="Example #1 (Adding description to path parameter)"
app.get('/path/:id', (req, res) => {
    ...
    //  #swagger.parameters['id'] = { description: 'Some description...' }
    ...
});
```

```js title="Example #2 (Creating a new parameter called 'parameterName')"
app.get('/path', (req, res) => {
    ...
    /*  #swagger.parameters['parameterName'] = {
            in: 'query',
            description: 'Some description...'
            type: 'number'
    } */
    ...
});
```

```js title="Example #3 (Creating a body with referenced schema)"
app.post('/path', (req, res) => {
    ...
    /*  #swagger.parameters['body'] = {
            in: 'body',
            description: 'Add a user',
            schema: { $ref: '#/definitions/someDefinition' }
    } */
    ...
});
```

```js title="Example #4 (Creating a body with explicit schema)"
app.post('/path', (req, res) => {
    ...
    /*  #swagger.parameters['body'] = {
            in: 'body',
            description: 'Some description...',
            schema: {
                $name: 'John Doe',
                $age: 29,
                about: ''
            }
    } */
    ...
});
```

```js title="Example #5 (Uploading file(s))"
// Upload single file using Multer
app.post("/upload", uploader.single("singleFile"), (req, res) => {
    /*
        #swagger.consumes = ['multipart/form-data']  
        #swagger.parameters['singleFile'] = {
            in: 'formData',
            type: 'file',
            required: 'true',
            description: 'Some description...',
    } */

    const file = req.file;
});

// Upload multiple files using Multer
app.post("/uploads", uploader.array("multFiles", 2), (req, res) => {
    /*
        #swagger.consumes = ['multipart/form-data']  
        #swagger.parameters['multFiles'] = {
            in: 'formData',
            type: 'array',
            required: true,
            description: 'Some description...',
            collectionFormat: 'multi',
            items: { type: 'file' }
        } */

    const files = req.files;
});
```

### Body behaviors

To disable the automatic body recognition, see about the **autoBody** in the [Options](/docs/options).

If there is any `#swagger.parameters[...] = { in: 'body', ... }` with **schema** declared, the automatic body recognition will be ignored, for example:

```js
app.post('/path', (req, res) => {
    ...
    /*  #swagger.parameters['body'] = {
            in: 'body',
            description: 'Some description...',
            schema: {
                $name: 'John Doe',
                $age: 29,
                about: ''
            }
    } */

    const myItem1 = req.body.item1;     // Will be ignored by swagger-autogen

    const { item2, item3 } = req.body;  // Will be ignored by swagger-autogen
    ...
});
```

However, if you want to add more information to the automatically recognized **body**, declared the `#swagger.parameters` adding `in: 'body'`, BUT without the **schema**, such as:

```js
app.post('/path', (req, res) => {
    ...
    /*  #swagger.parameters['body'] = {
            in: 'body',
            description: 'Some description...'
    } */

    const myItem1 = req.body.item1;

    const { item2, item3 } = req.body;

    ...
});
```

In the case above, the **body** will be automatically recognized and the description will be assigned to it.
