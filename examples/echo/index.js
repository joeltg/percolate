/**
 * This example creates two parallel Underlay nodes, alpha and beta.
 * Alpha has no bootstrap peers and uses a handler that logs every message to the console.
 * Beta has alpha as a bootstrap peer and uses a handler that echoes every message back to its sender.
 * After both nodes are initialized, alpha sends a message to beta.
 */

const path = require("path")
const fs = require("fs-extra")

const Percolator = require("../../index.js")
const log = require("../../tools/log.js")
const { fromStore } = require("../../utils.js")

const message = {
	"@context": { "@vocab": "http://schema.org/" },
	"@type": "Volcano",
	smokingAllowed: true,
}

const alphaPath = path.resolve(__dirname, "alpha")
const betaPath = path.resolve(__dirname, "beta")

// Remove repos if they exist
fs.removeSync(alphaPath)
fs.removeSync(betaPath)

const alpha = new Percolator(alphaPath, true, {
	Addresses: {
		Swarm: ["/ip4/127.0.0.1/tcp/4002"],
		API: "/ip4/127.0.0.1/tcp/5002",
		Gateway: "/ip4/127.0.0.1/tcp/8081",
	},

	Bootstrap: [],
})

const { protocol } = alpha.protocols["cbor-ld"]

alpha.use(log)

alpha.start((err, alphaId) => {
	if (err) {
		console.error(err)
		return
	}

	console.log("alpha:", alphaId)

	const beta = new Percolator(betaPath, true, {
		Addresses: {
			Swarm: ["/ip4/127.0.0.1/tcp/4003"],
			API: "/ip4/127.0.0.1/tcp/5003",
			Gateway: "/ip4/127.0.0.1/tcp/8082",
		},

		Bootstrap: [`/ip4/127.0.0.1/tcp/4002/ipfs/${alphaId}`],
	})

	beta.use((peer, { store }, next) => {
		console.log("beta: received message from", peer)
		fromStore(store, (err, doc) => {
			if (err) {
				console.error(err)
			} else {
				console.log("beta: echoing back to sender")
				beta.send(peer, protocol, doc)
			}
		})
	})

	beta.start((err, betaId) => {
		if (err) {
			console.error(err)
		} else {
			console.log("beta:", betaId)
			setTimeout(() => {
				console.log("sending message from alpha to beta")
				alpha.send(betaId, protocol, message)
			}, 2000)
		}
	})
})
