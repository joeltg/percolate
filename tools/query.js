const fs = require("fs")
const path = require("path")

const { N3 } = require("furk")
const ShExParser = require("furk/packages/shex-parser")
const ShExCore = require("furk/packages/shex-core")

const Shape = require("./shape.js")

const querySchemaPath = path.resolve(__dirname, "query.shex")
const querySchema = fs.readFileSync(querySchemaPath, "utf-8")

/**
 *
 * @param {{schema: string, start: string, handler: handler}[]} queries
 */
function Query(queries) {
	const parser = ShExParser.construct()
	for (const query of queries) {
		if (typeof query.schema === "string") {
			query.schema = parser.parse(query.schema)
		}

		if (query.start === undefined || query.start === null) {
			query.start = query.schema.start
		}
	}

	function tick(peer, message, next, index) {
		const { graphs, results } = message
		for (let i = index; i < queries.length; i++) {
			const { schema, start, handler } = queries[i]
			const queryResults = {}
			for (const { node } of results) {
				const store = graphs[node]
				const db = ShExCore.Util.makeN3DB(store)

				const results = []
				const validator = ShExCore.Validator.construct(schema)
				store.forSubjects(subject => {
					const id = N3.DataFactory.internal.toId(subject)
					const result = validator.validate(db, id, start)
					if (result.type === "ShapeTest") {
						results.push(result)
					}
				})

				if (results.length > 0) {
					queryResults[node] = results
				}
			}

			if (Object.keys(queries).length > 0) {
				message.queryResults = queryResults
				handler(peer, message, () => tick(peer, message, next, i + 1))
				return
			}
		}
		next()
	}

	const queryShape = {
		schema: querySchema,
		handler: (peer, message, next) => tick(peer, message, next, 0),
	}

	return Shape([queryShape])
}

module.exports = Query
