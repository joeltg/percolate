const jsonld = require("jsonld")
const N3 = require("N3")

function fromStore(store, callback) {
	const writer = new N3.Writer({ format: "N-Quads" })
	store.forEach(quad => writer.addQuad(quad))
	writer.end((err, result) => {
		if (err) {
			callback(err)
		} else {
			jsonld.fromRDF(result, { format: "application/n-quads" }, callback)
		}
	})
}

module.exports = fromStore
