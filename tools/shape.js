const N3 = require("n3")
const ShExParser = require("../shex.js/packages/shex-parser")
const ShExCore = require("../shex.js/packages/shex-core")

/**
 * Invoke the next handler in the stack.
 *
 * @callback next
 */

/**
 * Callback for adding two numbers.
 *
 * @callback handler
 * @param {string} peer - The sender's 58-encoded PeerId
 * @param {N3.Store} store
 * @param {Array} results
 * @param {next} next
 */

/**
 *
 * @param {{schema: string, start: string, handler: handler}[]} routes
 */
function Shape(routes) {
	const parser = ShExParser.construct()
	routes.forEach(route => {
		const { schema, start } = route
		if (typeof schema === "string") {
			route.schema = parser.parse(schema)
		}

		if (start === undefined) {
			route.start = schema.start
		}

		route.validator = ShExCore.Validator.construct(schema)
	})

	return (peer, store, next) => {
		const db = ShExCore.Util.makeN3DB(store)
		const results = []
		for (const { validator, start, handler } of routes) {
			store.forSubjects(subject => {
				const id = N3.DataFactory.internal.toId(subject)
				const result = validator.validate(db, id, start)
				if (result.type === "ShapeTest") {
					results.push(result)
				} else if (result.type === "Failure") {
					// nothing
				}
			})
			if (subjects.length > 0) {
				handler(peer, store, results, next)
				return
			}
		}
		next()
	}
}

module.exports = Shape
