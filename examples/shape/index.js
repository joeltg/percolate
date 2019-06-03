const path = require("path")
const fs = require("fs-extra")

const Percolator = require("../../index.js")
const fromStore = require("../../tools/fromStore.js")
const Shape = require("../../tools/shape.js")

const message = {
	"@context": { "@vocab": "http://schema.org/" },
	"@type": "Volcano",
	smokingAllowed: true,
	name: "Mount Fuji",
}

const schema = fs.readFileSync(path.resolve(__dirname, "Volcano.shex"), "utf-8")

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

alpha.use((peer, store, next) => {
	console.log("alpha: received message from", peer)
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

	function handler(peer, store, results, next) {
		console.log("beta: received a volcano from", peer)
		const [
			{
				node,
				solution: {
					solutions: [{ expressions }],
				},
			},
		] = results
		const {
			solutions: [
				{
					object: { value: smokingAllowed },
				},
			],
		} = expressions.find(
			({ predicate }) => predicate === "http://schema.org/smokingAllowed"
		)
		const {
			solutions: [
				{
					object: { value: name },
				},
			],
		} = expressions.find(
			({ predicate }) => predicate === "http://schema.org/name"
		)
		console.log(
			`got volcano ${node} with name ${name}. Smoking ${
				smokingAllowed === "true" ? "is" : "is NOT"
			} allowed.`
		)
	}

	beta.use(Shape([{ schema, handler }]))

	beta.use((peer, store, next) => {
		console.log("beta: received a non-volcano from peer", peer)
		fromStore(store, (err, doc) => {
			if (err) {
				console.error(err)
			} else {
				console.log("beta: echoing non-volcano back to sender")
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
				alpha.send(identity.id, { "http://foo.bar": "BAZ" })
			}, 3000)
		}
	})
})
