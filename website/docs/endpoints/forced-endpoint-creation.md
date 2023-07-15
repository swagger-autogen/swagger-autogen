---
id: forced-endpoint-creation
title: Forced Endpoint Creation
sidebar_position: 12
---

If you want to forcibly create an endpoint, use the `#swagger.start` and` #swagger.end`, for example:

```js
    // #swagger.start
    ...
    /*
        #swagger.path = '/forcedEndpoint/{id}'
        #swagger.method = 'put'
        #swagger.description = 'Forced endpoint.'
        #swagger.produces = ['application/json']
    */
    ...
    /*  #swagger.parameters['id'] = {
            in: 'path',
            type: 'integer',
            description: 'User ID.' 
        } */
    ...
    /*  #swagger.parameters['obj'] = {
            in: 'query',
            description: 'User data.',
            schema: { $ref: '#/definitions/AddUser' }
        } */
    
    // #swagger.responses[200]
    ...
    // #swagger.responses[404]
    ...
    // #swagger.end
```
