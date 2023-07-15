---
id: schemas-and-components
title: Schemas and Components
sidebar_position: 1
---

```mdx-code-block
<div style={{textAlign: 'justify'}}>

Schemas and Components in this module are added in a simpler way, that is, you can write it in the way you want to see the result. Responses can be added to the *components.schemas* of the `doc` object seen in the [Advanced Usage](/docs/getting-started/advanced-usage#openapi-3x) section, or directly to the response via the *schema* parameter.

**Types and Examples in the schema:** The type is abstracted according to the *typeof* of the example, and the example comes right in front of the parameter declaration. In the example below, for the `someSchema`, the type of the parameter `name` will be **string** and its example will be `John Doe`, while the type of the parameter `age` will be **number** and its example will be `29`.

**NOTE:** To configure a parameter as **required**, just add the symbol **$** before the parameter, for example: `$name = "John Doe"`.

</div>
```

```js title="swagger.js"
const doc = {
    ...
    components: {
        schemas: {
            someSchema: {
                $name: 'John Doe',
                $age: 29,
                about: ''
            },
            ...
        }
    }
};
```

To reference your schema in the `doc` object, use the `$ref: "#/components/schemas/someSchema"`, for example:

```js title="Example"
app.get('/path', (req, res) => {
    ...
    /*	#swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/someSchema"
                    }  
                }
            }
        } 
    */
    ...
    /* #swagger.responses[200] = {
            description: "Some description...",
            content: {
                "application/json": {
                    schema:{
                        $ref: "#/components/schemas/someSchema"
                    }
                }           
            }
        }   
    */
   ...

})
```

```mdx-code-block
<div style={{textAlign: 'justify'}}>

To see more about **body** and **responses**, check the [Request Body](/docs/openapi-3/request-body) and [Responses](/docs/openapi-3/responses) sections.

</div>
```

### Adding examples

```mdx-code-block
<div style={{textAlign: 'justify'}}>

It is possible to add *examples* as shown in the OpenAPI v3 specification [click here](https://swagger.io/docs/specification/adding-examples/).

</div>
```

```js title="Example"
const doc = {
    ...
    components: {
        examples: {
            someExample:{
                value:{
                    name: 'John Doe',
                    age: 29
                },
                summary: "Sample"
            }
        }
    }
}
```

```js title="Example #1 (Adding just one example)"
app.post('/path', (req, res) => {
    ...
    /* #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/someSchema" },
                    example: { 
                        $ref: "#/components/examples/someExample"
                    }
                }
            }
        }
    */
    ...
});
```

```js title="Example #2 (Adding one or more examples)"
app.post('/path', (req, res) => {
    ...
    /* #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/someSchema" },
                    examples: { 
                        someExample1: { $ref: "#/components/examples/someExample1" },
                        someExample2: { $ref: "#/components/examples/someExample2" }
                    }
                }
            }
        }
    */
    ...
});
```


```js title="Example #3 (Adding example directly)"
app.post('/users', (req, res) => {
    ...
    /* #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/User" },
                    example: {
                        name: "Sample",
                        value:{
                            name: 'John Doe',
                            age: 29
                        }
                    }
                }
            }
        }
    */
    ...
});
```

### @schema

```mdx-code-block
<div style={{textAlign: 'justify'}}>

Use the `'@schema'` instead of `schema` if you don't want swagger-autogen to render the schema. In this case you must build the schema according to Swagger's specs. The result in the _.json_ will be the same in `'@schema'`.

To ignore the swagger-autogen render in the `components.schemas` and put the specification Swagger directly, you can use the `'@schemas'`, such as: 

</div>
```

```js
const doc = {
    ...
    components:{
        '@schemas': {
            someParameter: {
                type: 'object',
                properties: {
                    property1: {
                        type: 'integer',
                        format: 'int32',
                        description: 'With no swagger-autogen render...'
                    }
                }
            }
        }
    }
};
```

That way, the schemas in the _.json_ will be the same as in the `'@schemas'`.

See more examples about the swagger-autogen rendering behavior [here](/docs/swagger-2/schemas-and-definitions#example-of-definitions).
