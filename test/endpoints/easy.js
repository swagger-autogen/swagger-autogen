
const users = require('./users')
let expression = true


module.exports = function (app) {

	/* NOTE: 100% automatic */
	app.get('/automatic/user/:id', (req, res) => {
		res.setHeader('Content-Type', 'application/json')
		const dataId = users.getUser(req.params.id)
		const dataObj = users.getUser(req.query.obj)

		if (expression)
			return res.status(200).send(true)
		return res.status(404).send(false)
	})

	/* NOTE: 100% automatic */
	app.post('/automatic/user', (req, res) => {
		res.setHeader('Content-Type', 'application/xml')
		const data = users.addUser(req.query.obj)
		
		if (expression)
			return res.status(201).send(data)
		return res.status(500)
	})

	/* NOTE: Completing informations automaticaly obtaineds */
	app.get('/automatic_and_incremented/user/:id', (req, res) => {
		/* 	#swagger.tags = ['User']
			#swagger.description = 'Endpoint to get the specific user.' */
		res.setHeader('Content-Type', 'application/json')
		const data = users.getUser(req.params.id)

		if (expression) {
			/* #swagger.responses[200] = { 
				schema: { $ref: "#/definitions/User" },
				description: "User registered successfully." } */
			return res.status(200).send(data)
		}
		return res.status(404).send(false)	// #swagger.responses[404]
	})

	/* NOTE: Completing informations automaticaly obtaineds */
	app.post('/automatic_and_incremented/user', (req, res) => {
		res.setHeader('Content-Type', 'application/xml')
		/* 	#swagger.tags = ['User']
			#swagger.description = 'Endpoint to add a user.' */

		/*	#swagger.parameters['obj'] = {
				in: 'body',
				description: 'User information.',
				required: true,
				type: 'object',
				schema: { $ref: "#/definitions/AddUser" }
        } */
		const data = users.addUser(req.body)

		if (expression) {
			// #swagger.responses[201] = { description: 'User registered successfully.' }
			return res.status(201).send(data)
		}
		return res.status(500)	// #swagger.responses[500]
	})

	/* NOTE: Function with callback referencied */
	app.delete('/automatic_and_incremented/user/:id', myFunction1
	/*  #swagger.tags = ['User']
		#swagger.parameters['id'] = {
			description: 'User ID.'
		}
		
		#swagger.responses[200]
		#swagger.responses[404]
	*/)

	/* NOTE: Will be ignored in the build */
	app.get('/toIgnore', (req, res) => {
		// #swagger.ignore = true
		res.setHeader('Content-Type', 'application/json')

		if (expression)
			return res.status(200).send(true)
		return res.status(404).send(false)
	})

	app.patch('/manual/user/:id', (req, res) => {
        /*  #swagger.auto = false

            #swagger.path = '/manual/user/{id}'
			#swagger.method = 'patch'
			#swagger.description = 'Endpoint added manually.'
		    #swagger.produces = ["application/json"]
            #swagger.consumes = ["application/json"]
        */

		/*	#swagger.parameters['id'] = {
				in: 'path',
				description: 'User ID.',
				required: true
			}
  		*/

		/*	#swagger.parameters['obj'] = {
                in: 'query',
                description: 'User information.',
                required: true, 
                type: 'string'
			}
		*/

		if (expression) {
			/* #swagger.responses[200] = { 
				schema: { $ref: "#/definitions/User" }, description: "User found." }
			*/
			return res.status(200).send(data)
		}
		// #swagger.responses[500] = { description: "Server Failure." }
		return res.status(500).send(false)
	})

	app.head('/security', (req, res) => {
		res.setHeader('Content-Type', 'application/json')
		/* #swagger.security = [{
			"petstore_auth": [
				"write_pets",
				"read_pets"
			]
		}] */

		const dataObj = users.getUser(req.query.obj)

		if (expression)
			return res.status(200).send(true)
		return res.status(404).send(false)
	})
}

function myFunction1(p) {
	const dataId = users.getUser(req.params.id)

	if (expression)
		return res.status(200).send(true)
	return res.status(404).send(false)
}

function myFunction2(p) {
	// #swagger.start

	/*
		#swagger.path = '/forcedEndpoint/{id}'
		#swagger.method = 'put'
		#swagger.description = 'Forced endpoint.'
		#swagger.produces = ["application/json"]
	*/

	/*  #swagger.parameters['id'] = { in: 'path', description: 'User ID.' } */
	const dataId = users.getUser(req.params.id)

	/*	#swagger.parameters['obj'] = { 
			in: 'body',
			description: 'User information.',
			type: 'object',
			schema: {
                $name: "Jhon Doe",
                $age: 29,
                about: ""
            }
    } */
	const dataObj = users.getUser(req.query.obj)

	if (expression)
		return res.status(200).send(true)	// #swagger.responses[200]
	return res.status(404).send(false)		// #swagger.responses[404]

	// #swagger.end
}