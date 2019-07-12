const fetch = require("node-fetch")

const Shape = require("./shape.js")
const { fromStore } = require("../utils.js")

const fetchOptions = {
	method: "POST",
	headers: { "Content-Type": "application/ld+json" },
}

const encodeNode = ({ node }) => `node=${encodeURIComponent(node)}`

const makeShape = ({ schema, start, url }) => ({
	schema,
	start,
	handler(peer, { store, results }, next) {
		fromStore(store, (err, doc) => {
			if (err) {
				console.error(err)
			} else {
				const nodes = results.map(encodeNode)
				const query = `peer=${peer}&${nodes.join("&")}`
				const body = JSON.stringify(doc)
				const options = { ...fetchOptions, body }
				fetch(`${url}?${query}`, options)
					.then(res => res.ok || next())
					.catch(err => console.error(err))
			}
		})
	},
})

module.exports = routes => Shape(routes.map(makeShape))
