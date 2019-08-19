const N3 = require("n3")
const ShExParser = require("shex-parser")
const ShExCore = require("shex-core")

/**
 *
 * @param {{schema: string, start: string, handler: handler}[]} queryShapes
 */
function Query(queryShapes) {
	const parser = ShExParser.construct()
	for (const query of queryShapes) {
		if (typeof query.schema === "string") {
			query.schema = parser.parse(query.schema)
		}

		if (query.start === undefined || query.start === null) {
			query.start = query.schema.start
		}
	}

	function tick(peer, message, next, index) {
		const { graphs, query } = message
		for (let i = index; i < queryShapes.length; i++) {
			const { schema, start, handler } = queryShapes[i]
			const results = {}
			console.log("okay we're gonna test the graphs", query.graphs)
			for (const node of query.graphs) {
				console.log("testing", node)
				const store = graphs[node]
				const db = ShExCore.Util.makeN3DB(store)

				results[node] = []
				const validator = ShExCore.Validator.construct(schema)
				store.forSubjects(({ id }) => {
					const result = validator.validate(db, id, start)
					console.log("testing subject", id)
					console.log("got result", result)
					if (
						result.hasOwnProperty("solutions") ||
						result.hasOwnProperty("solution")
					) {
						results[node].push(result)
					}
				})

				if (results[node].length === 0) {
					delete results[node]
				}
			}

			if (Object.keys(results).length > 0) {
				message.query.results = results
				handler(peer, message, () => tick(peer, message, next, i + 1))
				return
			}
		}
		next()
	}

	// const queryShape = {
	// 	schema: querySchema,
	// 	handler: (peer, message, next) => tick(peer, message, next, 0),
	// }

	// return Shape([queryShape])

	return (peer, message, next) => {
		message.query = { graphs: [] }
		message.graphs[""].forSubjects(
			({ id }) => message.query.graphs.push(id),
			"http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
			"http://underlay.mit.edu/ns#Query"
		)

		console.log("okay here are the graphs we got", message.query.graphs)
		if (message.query.graphs.length > 0) {
			return tick(peer, message, next, 0)
		} else {
			return next()
		}
	}
}

module.exports = Query
