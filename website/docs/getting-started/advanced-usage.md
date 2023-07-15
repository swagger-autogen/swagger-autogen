---
id: advanced-usage
title: Advanced Usage
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

```mdx-code-block
<div style={{textAlign: 'justify'}}>

This section shows how to implement swagger-autogen in your project using advanced options. The code below must be inserted in a separate file (e.g *swagger.js*):

</div>
```

## Swagger 2.0:

<Tabs>
<TabItem value="commonjs" label="CommonJs">

```js title="swagger.js"
const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    version: '',            // by default: '1.0.0'
    title: '',              // by default: 'REST API'
    description: ''         // by default: ''
  },
  host: '',                 // by default: 'localhost:3000'
  basePath: '',             // by default: '/'
  schemes: [],              // by default: ['http']
  consumes: [],             // by default: ['application/json']
  produces: [],             // by default: ['application/json']
  tags: [                   // by default: empty Array
    {
      name: '',             // Tag name
      description: ''       // Tag description
    },
    // { ... }
  ],
  securityDefinitions: {},  // by default: empty object
  definitions: {}           // by default: empty object
};

const outputFile = './swagger-output.json';
const routes = ['./path/userRoutes.js', './path/bookRoutes.js'];

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen(outputFile, routes, doc);
```

</TabItem>
<TabItem value="esmodules" label="ES Modules">

```js title="swagger.js"
import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    version: '',            // by default: '1.0.0'
    title: '',              // by default: 'REST API'
    description: ''         // by default: ''
  },
  host: '',                 // by default: 'localhost:3000'
  basePath: '',             // by default: '/'
  schemes: [],              // by default: ['http']
  consumes: [],             // by default: ['application/json']
  produces: [],             // by default: ['application/json']
  tags: [                   // by default: empty Array
    {
      name: '',             // Tag name
      description: ''       // Tag description
    },
    // { ... }
  ],
  securityDefinitions: {},  // by default: empty object
  definitions: {}           // by default: empty object
};

const outputFile = './swagger-output.json';
const routes = ['./path/userRoutes.js', './path/bookRoutes.js'];

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen()(outputFile, routes, doc);
```
</TabItem>
</Tabs>

## OpenAPI 3.x:

<Tabs>
<TabItem value="commonjs" label="CommonJs">

```js title="swagger.js"
const swaggerAutogen = require('swagger-autogen')({openapi: '3.0.0'});

const doc = {
  info: {
    version: '',            // by default: '1.0.0'
    title: '',              // by default: 'REST API'
    description: ''         // by default: ''
  },
  servers: [
    {
      url: '',              // by default: 'http://localhost:3000'
      description: ''       // by default: ''
    },
    // { ... }
  ],
  tags: [                   // by default: empty Array
    {
      name: '',             // Tag name
      description: ''       // Tag description
    },
    // { ... }
  ],
  components: {}            // by default: empty object
};

const outputFile = './swagger-output.json';
const routes = ['./path/userRoutes.js', './path/bookRoutes.js'];

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen(outputFile, routes, doc);
```

</TabItem>
<TabItem value="esmodules" label="ES Modules">

```js title="swagger.js"
import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    version: '',            // by default: '1.0.0'
    title: '',              // by default: 'REST API'
    description: ''         // by default: ''
  },
  servers: [
    {
      url: '',              // by default: 'http://localhost:3000'
      description: ''       // by default: ''
    },
    // { ... }
  ],
  tags: [                   // by default: empty Array
    {
      name: '',             // Tag name
      description: ''       // Tag description
    },
    // { ... }
  ],
  components: {}            // by default: empty object
};

const outputFile = './swagger-output.json';
const routes = ['./path/userRoutes.js', './path/bookRoutes.js'];

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen({openapi: '3.0.0'})(outputFile, routes, doc);
```
</TabItem>
</Tabs>

```mdx-code-block
<div style={{textAlign: 'justify'}}>

**outputFile:** (*Required*). Output file. It will be the file generated by the module containing the documentation in the format identified by Swagger.

**routes:** (*Required*). If you are using the express Router, you must pass in the 'routes' only the root file where the route starts, such as index.js, app.js, routes.js, etc. Otherwise, these are the files that contain methods such as *get*, *post*, *put*, *use*, and so on, for example: `route.use('/v1', ...)` or `app.get('/path', ...)`.

**doc:** (*Not Required*). An object containing the documentation details. If not informed, or if any object parameter is missing, the default values ​​will be used.

</div>
```

```js title="Main function signature"
const swaggerAutogen: (outputFile: <string>, routes: <string[]>, data: <object>) => Promise <any>
```

To build the documentation, add the following script in your project's **package.json** file:

```json title="package.json"
  ...
  "scripts": {
    ...
    "swagger": "node ./swagger.js"
  }
```

And run the following command:

```bash
npm run swagger
```

## Building documentation at project startup

```mdx-code-block
<div style={{textAlign: 'justify'}}>

To build the documentation before the project starts and immediately start it, rewrite the `swaggerAutogen(...)` function in your **swagger.js** file as follows:

</div>
```

<Tabs>
<TabItem value="commonjs" label="CommonJs">

```js title="swagger.js"
swaggerAutogen(outputFile, routes, doc).then(() => {
  require('./index.js'); // Your project's root file
});
```

</TabItem>
<TabItem value="esmodules" label="ES Modules">

```js title="swagger.js"
swaggerAutogen()(outputFile, routes, doc).then(async () => {
  await import('./index.js'); // Your project's root file
});
```
</TabItem>
</Tabs>

```mdx-code-block
<div style={{textAlign: 'justify'}}>

Where **index.js** is your project's root file. Change the **start** script in your project's **package.json** to look at the **swagger.js** file. If you are using Visual Studio Code, change the reference in your **launch.json** file in the same way. Now, just run your project as usual. Thus the documentation will be generated automatically as soon as the project start.

See: [Advanced Example](https://github.com/davibaltar/example-swagger-autogen-with-router)

</div>
```



:::note
```mdx-code-block
<div style={{textAlign: 'justify'}}>

This module is independent of any framework, but for the recognition to be **automatic**, your framework must follow the *"Express"* pattern, such as **foo.method(path, callback)**, where _foo_ is the variable belonging to the server or route, such as _app_, _server_, _route_, etc. The _method_ refers to HTTP methods, such as *get*, *post*, *put*, use and so on. If the **foo.method(path, callback)** pattern is not found in the files, it will be necessary to **manually** enter the beginning and end of the endpoint using the `#swagger.start` and `#swagger.end` (see the section **[Forced Endpoint Creation](/docs/endpoints/forced-endpoint-creation)** for more details).

</div>
```
:::