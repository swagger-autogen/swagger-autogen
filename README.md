# swagger-autogen

## Overview

This module performs automatic construction of Swagger documentation. It can identify the endpoints and automatically capture methods such as get, post, put, and so on. It also identifies paths, routes, middlewares, response status codes, parameters in the path, header, query and body. It is possible to add information such as endpoint description, parameter description, schemas, security, among others using comments in code. At the end, it generates the *.json* file containing the Swagger format specification.

[![NPM Version](http://img.shields.io/npm/v/swagger-autogen.svg?style=flat)](https://www.npmjs.com/package/swagger-autogen)
[![NPM Downloads](https://img.shields.io/npm/dm/swagger-autogen.svg?style=flat)](https://npmcharts.com/compare/swagger-autogen?minimal=true)

## Contents

- [Installation](#installation)
- [Documentation](#documentation)
- [Changelog](#changelog)
- [License](#license)

## Installation

This is a [Node.js](https://nodejs.org/en/) module available through the [npm](https://www.npmjs.com/).

```bash
$ npm install --save-dev swagger-autogen
```

If you're using CommonJS:

```js
const swaggerAutogen = require('swagger-autogen')();
```

Or if you're using ES modules:

```js
import swaggerAutogen from 'swagger-autogen';

```

## Documentation

Please refer to the documentation website on https://swagger-autogen.github.io.

## Changelog

Check the [GitHub Releases page](https://github.com/swagger-autogen/swagger-autogen/releases).

## Issues and Pull Requests

Due to the number of open issues and the lack of time to respond with quality, I've disabled the opening of issues for now. I'm still keeping my eyes on the project and I intend to prioritize the issues already open. Once I have closed a satisfactory number of issues, I will open it again. Pull Requests are closed as well. Thank you for understanding.

## License

[MIT](LICENSE) License
