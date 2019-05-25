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
		const route = routes.find(({ validator, start }) => {
			const result = validator.validate(db, "_:b0", start)
			if (result.type === "Failure") {
				return false
			} else if (result.type === "ShapeTest") {
				return true
			} else {
				// are there more options?
			}
		})
		if (route) {
			route.handler(peer, store, next)
		} else {
			next()
		}
	}
}

module.exports = Shape
