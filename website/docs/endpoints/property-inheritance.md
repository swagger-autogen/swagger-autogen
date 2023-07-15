---
id: property-inheritance
title: Property Inheritance
sidebar_position: 10
---

In order for the same properties to be assigned to all subroutes, declare them in middlewares, such as:

 
```js
app.use('/v1', routesV1
    /* 
    #swagger.tags = ['someTag']

    #swagger.security = [{
        "apiKeyAuth": []
    }] 

    #swagger.responses[500] = {
        schema: { $ref: '#/definitions/someSchema' }
    }  

    #swagger.responses[501] = {
        ifStatusPresent: true,
        schema: { $ref: '#/definitions/someSchema' }
    } 
    */
);
```

```mdx-code-block
<div style={{textAlign: 'justify'}}>

In the case above, all the enpoints belonging to `'/v1'` route will received the `someTag` tag, security property and status code 500. But only endpoints that contain the 501 status code will receive the description and schema declared in `#swagger.responses[501] = {...}` because of the `ifStatusPresent` property equal to *true*.

**NOTE 1:** By default, the `ifStatusPresent` parameter is *false*. For the case above, If it is true, only endpoints that contain any 501 status code will receive the properties. Otherwise, 501 status code will not be shown.

**NOTE 2:** To disable security only for a specific endpoint belonging to route `'/v1'`, use the `// #swagger.security = null `.

</div>
```
