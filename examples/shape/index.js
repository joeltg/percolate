/**
 * This example demonstrates the Shape middleware, uses shex.js to match messages whose
 * default graphs validate the provided shape expression.
 *
 * This example creates two parallel Underlay nodes, alpha and beta.
 * Alpha has no bootstrap peers and uses a handler that logs every message to the console.
 * Beta has alpha as a bootstrap peer and has two message handlers.
 * The first uses the Shape middleware to handle messages whose default graphs validate ./volcano.shex.
 * The second - invoked after Shape if the message doesn't validate - echoes the message back to the sender.
 * After both nodes are initialized, alpha sends two messages to beta.
 * The first message validates ./volcano.shex.
 * The second message does not.
 */

const path = require("path")
const fs = require("fs-extra")

const Percolator = require("../../index.js")
const { fromStore } = require("../../utils.js")
const log = require("../../tools/log.js")
const Shape = require("../../tools/shape.js")

const { protocol } = require("../../protocols/cbor-ld.js")

const message = {
	"@context": { "@vocab": "http://schema.org/" },
	"@type": "Volcano",
	smokingAllowed: true,
	name: "Mount Fuji",
}

const schema = fs.readFileSync(path.resolve(__dirname, "volcano.shex"), "utf-8")

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

alpha.use(log)

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

	function handler(peer, { store, results }, next) {
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

	beta.use((peer, { store }, next) => {
		console.log("beta: received a non-volcano from peer", peer)
		fromStore(store, (err, doc) => {
			if (err) {
				console.error(err)
			} else {
				console.log("beta: echoing non-volcano back to sender")
				beta.send(peer, protocol, doc)
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
				alpha.send(identity.id, protocol, message)
				alpha.send(identity.id, protocol, { "http://foo.bar": "BAZ" })
			}, 2000)
		}
	})
})
