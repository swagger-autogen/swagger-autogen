---
id: index
title: Introduction
hide_title: true
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<!-- # Swagger Autogen {#swagger-autogen} -->
<!-- [![NPM Version](http://img.shields.io/npm/v/swagger-autogen.svg)](https://www.npmjs.com/package/swagger-autogen) -->

<!-- <head>
  <meta name="description" content="This module performs automatic construction of Swagger documentation. It can identify the endpoints and automatically capture methods such as get, post, put, and so on. It also identifies paths, routes, middlewares, response status codes and parameters. At the end, it generates the .json file containing the Swagger format specification."></meta>
</head> -->

![image](/img/logo_name.svg)


## Overview

```mdx-code-block
<div style={{textAlign: 'justify'}}>
  This module performs automatic construction of Swagger documentation. It can identify the endpoints and automatically capture methods such as get, post, put, and so on. It also identifies paths, routes, middlewares, response status codes, parameters in the path, header, query and body. It is possible to add information such as endpoint description, parameter description, schemas, security, among others using comments in code. At the end, it generates the <i>.json</i> file containing the Swagger format specification.
</div>
```


## Installation {#installation}

This is a [Node.js](https://nodejs.org/en/) module available through the [npm](https://www.npmjs.com/), [yarn](https://www.yarnpkg.com/) and [pnpm](https://pnpm.io/).

<Tabs>
<TabItem value="npm" label="npm">

```bash
npm install --save-dev swagger-autogen
```

</TabItem>
<TabItem value="yarn" label="yarn">

```bash
yarn add swagger-autogen --dev
```

</TabItem>
<TabItem value="pnpm" label="pnpm">

```bash
pnpm add --save-dev swagger-autogen
```

</TabItem>
</Tabs>

## Update

If you already have the module installed and want to update to the latest version, use the command:

<Tabs>
<TabItem value="npm" label="npm">

```bash
npm install --save-dev swagger-autogen@latest
```

</TabItem>
<TabItem value="yarn" label="yarn">

```bash
yarn add swagger-autogen --dev --latest
```

</TabItem>
<TabItem value="pnpm" label="pnpm">

```bash
pnpm add --save-dev swagger-autogen
```

</TabItem>
</Tabs>
