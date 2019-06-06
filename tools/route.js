const fetch = require("node-fetch")

const Shape = require("./shape.js")
const fromStore = require("./fromStore.js")

const fetchOptions = {
	method: "POST",
	headers: {
		"Content-Type": "application/ld+json",
	},
}

const makeShape = ({ schema, start, url }) => ({
	schema,
	start,
	handler: (peer, store, results, next) =>
		fromStore(store, (err, doc) => {
			if (err) {
				console.error(err)
			} else {
				const nodes = results.map(
					({ node }) => `node=${encodeURIComponent(node)}`
				)
				const query = `peer=${peer}&${nodes.join("&")}`
				fetch(url + "?" + query, {
					...fetchOptions,
					body: JSON.stringify(doc),
				})
					.then(res => {
						if (res.ok) {
							// great!
						} else {
							next()
						}
					})
					.catch(err => console.error(err))
			}
		}),
})

module.exports = routes => Shape(routes.map(makeShape))
