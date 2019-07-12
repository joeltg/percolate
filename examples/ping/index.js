/**
 * This example creates an Underlay node, and sends a message to a pre-specified bootstrap peer.
 */

const path = require("path")
const fs = require("fs-extra")

const Percolator = require("../../index.js")
const log = require("../../tools/log.js")

const { protocol } = require("../../protocols/cbor-ld.js")

const message = {
	"@context": { "@vocab": "http://schema.org/" },
	"@type": "http://underlay.mit.edu/ns#Query",
	"@graph": {
		"@type": "Volcano",
		smokingAllowed: {},
	},
}

const alphaPath = path.resolve(__dirname, "alpha")

// Remove repo if it exists
fs.removeSync(alphaPath)

const alpha = new Percolator(alphaPath, true, {
	Addresses: {
		Swarm: ["/ip4/127.0.0.1/tcp/4002"],
		API: "/ip4/127.0.0.1/tcp/5002",
		Gateway: "/ip4/127.0.0.1/tcp/8081",
	},

	Bootstrap: [
		"/ip4/127.0.0.1/tcp/4001/ipfs/QmSqPMkw1ZqimMMrTvocP4f5dHqQGBxQtBB91HXGXs2rTu",
	],
})

alpha.use(log)

alpha.start((err, identity) => {
	if (err) {
		console.error(err)
		return
	}

	console.log("alpha:", identity.id)

	setTimeout(() => {
		console.log("sending message from alpha")
		alpha.send(
			"QmSqPMkw1ZqimMMrTvocP4f5dHqQGBxQtBB91HXGXs2rTu",
			protocol,
			message
		)
	}, 2000)
})
