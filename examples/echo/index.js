const path = require("path")
const fs = require("fs-extra")

const Percolator = require("../../index.js")
const fromStore = require("../../tools/fromStore.js")

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

alpha.use((peer, { store, graphs, hash, size }, next) => {
	console.log("alpha: received echo from", peer)
	fromStore(store, (err, doc) => {
		if (err) {
			console.error(err)
		} else {
			console.log(doc)
		}
	})
})

alpha.start((err, identity) => {
	if (err) {
		console.error(err)
		return
	}

	console.log("alpha:", identity.id)

	const beta = new Percolator(betaPath, true, {
		Addresses: {
			Swarm: ["/ip4/127.0.0.1/tcp/4003"],
			API: "/ip4/127.0.0.1/tcp/5003",
			Gateway: "/ip4/127.0.0.1/tcp/8082",
		},

		Bootstrap: [`/ip4/127.0.0.1/tcp/4002/ipfs/${identity.id}`],
	})

	beta.use((peer, { store, graphs, hash, size }, next) => {
		console.log("beta: received message from", peer)
		fromStore(store, (err, doc) => {
			if (err) {
				console.error(err)
			} else {
				console.log("beta: echoing back to sender")
				beta.send(peer, doc)
			}
		})
	})

	beta.start((err, identity) => {
		if (err) {
			console.error(err)
		} else {
			console.log("beta:", identity.id)
			setTimeout(() => {
				console.log("sending message from alpha to beta")
				alpha.send(identity.id, message)
			}, 3000)
		}
	})
})
