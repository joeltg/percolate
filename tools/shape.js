const N3 = require("n3")
const ShExParser = require("../../shex.js/packages/shex-parser")
const ShExCore = require("../../shex.js/packages/shex-core")

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
 * @param {{schema: string, start: string, handler: handler}[]} shapes
 */
function Shape(shapes) {
	const parser = ShExParser.construct()
	shapes.forEach(shape => {
		const { schema, start } = shape
		if (typeof schema === "string") {
			shape.schema = parser.parse(schema)
		}

		if (start === undefined || start === null) {
			shape.start = shape.schema.start
		}

		shape.validator = ShExCore.Validator.construct(shape.schema)
	})

	return (peer, store, next) => {
		const db = ShExCore.Util.makeN3DB(store)
		for (const { schema, start, handler } of shapes) {
			const results = []
			const validator = ShExCore.Validator.construct(schema)
			store.forSubjects(subject => {
				const id = N3.DataFactory.internal.toId(subject)
				const result = validator.validate(db, id, start)
				if (result.type === "ShapeTest") {
					results.push(result)
				} else if (result.type === "Failure") {
					// nothing
				}
			})
			if (results.length > 0) {
				handler(peer, store, results, next)
				return
			}
		}
		next()
	}
}

module.exports = Shape
