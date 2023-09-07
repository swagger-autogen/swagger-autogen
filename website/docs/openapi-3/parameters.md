---
id: parameters
title: Parameters
sidebar_position: 2
---

```mdx-code-block
<div style={{textAlign: 'justify'}}>

It is possible to add parameters or complement automatically detected parameters such as *path*, *header* and *query*. Use the `#swagger.parameters['parameterName']` to create a new parameter or to complete an existing parameter (automatically detected).

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
**schema:** Parameter's schema

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
            description: 'Some description...',
            type: 'number'
    } */
    ...
});
```

To reference one or more parameters, use the `#swagger.parameters` passing the `$ref` value, such as:

```js title="Example #3 (Referenced parameters)"
app.post('/path', (req, res) => {
    ...
    /*  #swagger.parameters['$ref'] = ['#/components/parameters/someParameter1', '#/components/parameters/someParameter2'] */
    ...
});
```
