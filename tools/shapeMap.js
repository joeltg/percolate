const fs = require("fs")
const path = require("path")

const Query = require("./shape.js")
const fromStore = require("./fromStore.js")

const shapeMapSchemaPath = path.resolve(__dirname, "query.shex")
const shapeMapSchema = fs.readFileSync(shapeMapSchemaPath, "utf-8")

const makeQuery = ({ schema, start, handler }) => ({
	schema: shapeMapSchema,
	handler(peer, { store, results }, next) {
		fromStore(store, (err, doc) => {
			if (err) {
				console.error(err)
			} else {
				console.log("RESULTS!", peer, results)
			}
		})
	},
})

module.exports = shapes => Query(shapes.map(makeQuery))
