const path = require("path")
const jsonld = require("jsonld")
const N3 = require("N3")

const Percolator = require("../../index.js")

const message = {
	"@context": { "@vocab": "http://schema.org/" },
	"@type": "Volcano",
	smokingAllowed: true,
}

const alpha = new Percolator(path.resolve(__dirname, "alpha"), true, {
	Addresses: {
		Swarm: ["/ip4/127.0.0.1/tcp/4002"],
		API: "/ip4/127.0.0.1/tcp/5002",
		Gateway: "/ip4/127.0.0.1/tcp/8081",
	},

	Bootstrap: [],
})

alpha.use((peer, store, next) => {
	const writer = new N3.Writer({ format: "N-Quads" })
	store.forEach(quad => writer.addQuad(quad))
	writer.end((err, result) => {
		jsonld.fromRDF(result, { format: "application/n-quads" }, (err, doc) => {
			console.log("received echo from", peer)
			console.log(doc)
		})
	})
})

alpha.start((err, identity) => {
	if (err) {
		console.error(err)
		return
	}

	console.log("alpha:", identity.id)

	const beta = new Percolator(path.resolve(__dirname, "beta"), true, {
		Addresses: {
			Swarm: ["/ip4/127.0.0.1/tcp/4003"],
			API: "/ip4/127.0.0.1/tcp/5003",
			Gateway: "/ip4/127.0.0.1/tcp/8082",
		},

		Bootstrap: [`/ip4/127.0.0.1/tcp/4002/ipfs/${identity.id}`],
	})

	beta.use((peer, store, next) => {
		const writer = new N3.Writer({ format: "N-Quads" })
		store.forEach(quad => writer.addQuad(quad))
		writer.end((err, result) => {
			jsonld.fromRDF(result, { format: "application/n-quads" }, (err, doc) => {
				console.log("echoing back to sender", peer)
				beta.send(peer, doc)
			})
		})
	})

	beta.start((err, identity) => {
		if (err) {
			console.error(err)
		} else {
			console.log("beta:", identity.id)
		}
	})

	setTimeout(() => beta.send(identity.id, message), 3000)
})
