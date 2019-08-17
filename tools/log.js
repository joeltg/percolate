const { fromStore } = require("../utils.js")

module.exports = (peer, { store }, next) => {
	console.log("received message from", peer)
	fromStore(store, (err, doc) => {
		if (err) {
			console.error(err)
		} else {
			console.log(JSON.stringify(doc, null, "  "))
		}
	})
}
