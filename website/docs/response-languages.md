---
id: response-languages
title: Response Languages
sidebar_position: 7
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

```mdx-code-block
<div style={{textAlign: 'justify'}}>

It is possible to change the default language (English) of the description in the automatic response, for example, status code 404, the description will be: 'Not Found'. To change, pass an object with the following parameter:

</div>
```

### English (default)

<Tabs>
<TabItem value="commonjs" label="CommonJs">

```js
const swaggerAutogen = require('swagger-autogen')();
// In this case, for example, the description of status code 404 will be:
// 'Not Found'
```

</TabItem>
<TabItem value="esmodules" label="ES Modules">

```js
swaggerAutogen()(outputFile, routes, doc);
// In this case, for example, the description of status code 404 will be:
// 'Not Found'
```
</TabItem>
</Tabs>

---

### Portuguese [Brazil]

<Tabs>
<TabItem value="commonjs" label="CommonJs">

```js
const swaggerAutogen = require('swagger-autogen')({ language: 'pt-BR' });
// In this case, for example, the description of status code 404 will be:
// 'Não Encontrado'
```

</TabItem>
<TabItem value="esmodules" label="ES Modules">

```js
swaggerAutogen({ language: 'pt-BR' })(outputFile, routes, doc);
// In this case, for example, the description of status code 404 will be:
// 'Não Encontrado'
```
</TabItem>
</Tabs>

---

### Chinese [Simplified]

<Tabs>
<TabItem value="commonjs" label="CommonJs">

```js
const swaggerAutogen = require('swagger-autogen')({ language: 'zh-CN' });
// In this case, for example, the description of status code 404 will be:
// '未找到'
```

</TabItem>
<TabItem value="esmodules" label="ES Modules">

```js
swaggerAutogen({ language: 'zh-CN' })(outputFile, routes, doc);
// In this case, for example, the description of status code 404 will be:
// '未找到'
```
</TabItem>
</Tabs>

---

### Korean

<Tabs>
<TabItem value="commonjs" label="CommonJs">

```js
const swaggerAutogen = require('swagger-autogen')({ language: 'ko' });
// In this case, for example, the description of status code 404 will be:
// '찾을 수 없음'
```

</TabItem>
<TabItem value="esmodules" label="ES Modules">

```js
swaggerAutogen({ language: 'ko' })(outputFile, routes, doc);
// In this case, for example, the description of status code 404 will be:
// '찾을 수 없음'
```
</TabItem>
</Tabs>

---

### French

<Tabs>
<TabItem value="commonjs" label="CommonJs">

```js
const swaggerAutogen = require('swagger-autogen')({ language: 'fr' });
// In this case, for example, the description of status code 404 will be:
// 'Non Trouvé'
```

</TabItem>
<TabItem value="esmodules" label="ES Modules">

```js
swaggerAutogen({ language: 'fr' })(outputFile, routes, doc);
// In this case, for example, the description of status code 404 will be:
// 'Non Trouvé'
```
</TabItem>
</Tabs>