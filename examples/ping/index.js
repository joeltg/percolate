/**
 * This example creates an Underlay node, and sends a message to a pre-specified bootstrap peer.
 */

const path = require("path")
const fs = require("fs-extra")

const Percolator = require("../../index.js")
const log = require("../../tools/log.js")

const { protocol } = require("../../protocols/cbor-ld.js")

const data = {
	"@context": { "@vocab": "http://schema.org/" },
	"@type": "Volcano",
	name: "Mount Fuji",
	smokingAllowed: true,
}

const query = {
	"@context": {
		"@vocab": "http://schema.org/",
		u: "http://underlay.mit.edu/ns#",
	},
	"@type": "u:Query",
	"@graph": {
		"@type": "Volcano",
		name: {},
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
		"/ip4/127.0.0.1/tcp/4001/ipfs/QmYxMiLd4GXeW8FTSFGUiaY8imCksY6HH9LBq86gaFiwXG",
	],
})

alpha.use(log)

alpha.start((err, id) => {
	if (err) {
		console.error(err)
		return
	}

	console.log("alpha:", id)

	setTimeout(() => {
		console.log("sending message to alpha")
		alpha.send("QmYxMiLd4GXeW8FTSFGUiaY8imCksY6HH9LBq86gaFiwXG", protocol, data)
		setTimeout(() => {
			console.log("sending query to alpha")
			alpha.send(
				"QmYxMiLd4GXeW8FTSFGUiaY8imCksY6HH9LBq86gaFiwXG",
				protocol,
				query
			)
		}, 3000)
	}, 2000)
})
