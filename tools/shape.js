const N3 = require("n3")
const ShExParser = require("shex-parser")
const ShExCore = require("shex-core")

/**
 * Invoke the next handler in the stack.
 *
 * @callback next
 */

/**
 *
 * @callback handler
 * @param {string} peer - The sender's 58-encoded PeerId
 * @param {Object} message
 * @param {N3.Store} message.store
 * @param {Object.<string, N3.Store>} message.graphs
 * @param {string} message.hash
 * @param {number} message.size
 * @param {Array.<Object>} message.results
 * @param {next} next
 */

/**
 *
 * @param {{schema: string, start: string, handler: handler}[]} shapes
 */
function Shape(shapes) {
	const parser = ShExParser.construct()
	for (const shape of shapes) {
		if (typeof shape.schema === "string") {
			shape.schema = parser.parse(shape.schema)
		}

		if (shape.start === undefined || shape.start === null) {
			shape.start = shape.schema.start
		}
	}

	function tick(peer, message, next, index) {
		for (let i = index; i < shapes.length; i++) {
			const { schema, start, handler } = shapes[i]
			const results = []
			const validator = ShExCore.Validator.construct(schema)
			message.graphs[""].forSubjects(subject => {
				const id = N3.DataFactory.internal.toId(subject)
				const result = validator.validate(message.default, id, start)
				if (result.type === "ShapeTest") {
					results.push(result)
				}
			})

			if (results.length > 0) {
				message.results = results
				handler(peer, message, () => tick(peer, message, next, i + 1))
				return
			}
		}
		next()
	}

	return (peer, message, next) => {
		message.default = ShExCore.Util.makeN3DB(message.graphs[""])
		return tick(peer, message, next, 0)
	}
}

module.exports = Shape
