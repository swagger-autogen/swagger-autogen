---
id: options
title: Options
sidebar_position: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

It is possible to change some options of the module by passing an object as a parameter. This object is **optional**.

```js
const options = {
    openapi:          <string>,     // Enable/Disable OpenAPI.                        By default is null
    language:         <string>,     // Change response language.                      By default is 'en-US'
    disableLogs:      <boolean>,    // Enable/Disable logs.                           By default is false
    autoHeaders:      <boolean>,    // Enable/Disable automatic headers recognition.  By default is true
    autoQuery:        <boolean>,    // Enable/Disable automatic query recognition.    By default is true
    autoBody:         <boolean>,    // Enable/Disable automatic body recognition.     By default is true
    writeOutputFile:  <boolean>     // Enable/Disable writing the output file.        By default is true
};
```

<Tabs>
<TabItem value="commonjs" label="CommonJs">

```js title="swagger.js"
const swaggerAutogen = require('swagger-autogen')(options);
```

</TabItem>
<TabItem value="esmodules" label="ES Modules">

```js title="swagger.js"
swaggerAutogen(options)(outputFile, endpointsFiles, doc);
```
</TabItem>
</Tabs>

___

```mdx-code-block
<div style={{textAlign: 'justify'}}>

**openapi:** To enable OpenAPI v3, assign a version, such as `"3.0.0"`. If missing or assigned with *NULL*, Swagger 2.0 will be set.

**language:** Change the response language. To see available languages, go to the section [Response Languages](/docs/response-languages)

**autoHeaders, autoQuery and autoBody**: Enable or disable automatic automatic body, query or headers recognition. To enable/disable the recognition for a specific endpoint, use the following tags in the endpoint's function:

</div>
```

```js
// #swagger.autoBody = true 
OR 
// #swagger.autoBody = false
```
```js
// #swagger.autoQuery = true 
OR 
// #swagger.autoQuery = false
```
```js
// #swagger.autoHeaders = true 
OR 
// #swagger.autoHeaders = false
```



