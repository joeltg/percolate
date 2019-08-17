const N3 = require("n3")

const predicate = "http://underlay.mit.edu/ns#satisfies"
const underlayTest = /^ul:\/ipfs\/[a-zA-Z0-9]{46}#_:c14n\d+$/

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
 * @param {Object.<string, N3.Store>} message.graphs
 * @param {next} next
 */

/**
 *
 * @param {handler} handler
 */
function QueryResult(handler) {
	return (peer, message, next) => {
		const results = {}
		message.graphs[""].forEach(
			({ subject, object }) => {
				if (N3.Util.isBlankNode(subject) && N3.Util.isNamedNode(object)) {
					const graph = N3.DataFactory.internal.toId(subject)
					const query = N3.DataFactory.internal.toId(object)
					if (underlayTest.test(query)) {
						results[graph] = query
					}
				}
			},
			null,
			predicate,
			null
		)

		if (Object.keys(results).length > 0) {
			message.queryResults = results
			handler(peer, message, next)
		} else {
			next()
		}
	}
}

module.exports = QueryResult
