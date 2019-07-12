const jsonld = require("jsonld")
const { N3 } = require("furk")

const format = "application/n-quads"

function fromStore(store, callback) {
	const writer = new N3.Writer({ format: "N-Quads" })
	store.forEach(quad => writer.addQuad(quad))
	writer.end((err, result) => {
		if (err) {
			callback(err)
		} else {
			jsonld.fromRDF(result, { format }, callback)
		}
	})
}

module.exports = { fromStore, format }
