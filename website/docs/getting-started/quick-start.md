---
id: quick-start
title: Quick Start
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

```mdx-code-block
<div style={{textAlign: 'justify'}}>

This section shows a quick way to implement swagger-autogen in your project. The code below must be inserted in a separate file (e.g *swagger.js*):

</div>
```


<Tabs>
<TabItem value="commonjs" label="CommonJs">

```js title="swagger.js"
const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'My API',
    description: 'Description'
  },
  host: 'localhost:3000'
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
    title: 'My API',
    description: 'Description'
  },
  host: 'localhost:3000'
};

const outputFile = './swagger-output.json';
const routes = ['./path/userRoutes.js', './path/bookRoutes.js'];

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen()(outputFile, routes, doc);
```
</TabItem>
</Tabs>

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

### Examples

Links to projects that cover the simplest use and the most complete use of this module. See the links below:

[Simple Example](https://github.com/davibaltar/example-swagger-autogen)

[Advanced Example](https://github.com/davibaltar/example-swagger-autogen-with-router)