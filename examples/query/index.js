/**
 * This example demonstrates the Query middleware, which matches messages whose default graphs
 * validate a global "query" shape and whose corresponding query graphs validate the provided shape.
 *
 * This example creates two parallel Underlay nodes, alpha and beta.
 * Alpha has no bootstrap peers and uses a handler that logs every message to the console.
 * Beta has alpha as a bootstrap peer and has two message handlers.
 * The first uses the Query middleware to handle messages with *query graphs* that validate ./volcanoQuery.shex.
 * The second - invoked after the Query middleware if the message doesn't validate - echoes the message back to the sender.
 * After both nodes are initialized, alpha sends two messages to beta.
 * The first message is a valid query (whose query graph validates ./volcanoQuery.shex).
 * The second message is not a valid query.
 */

const path = require("path")
const fs = require("fs-extra")

const Percolator = require("../../index.js")
const log = require("../../tools/log.js")
const Query = require("../../tools/query.js")
const { fromStore } = require("../../utils.js")

const volcanoQuerySchemaPath = path.resolve(__dirname, "volcanoQuery.shex")
const volcanoQuerySchema = fs.readFileSync(volcanoQuerySchemaPath, "utf-8")

const message = {
	"@context": {
		"@vocab": "http://schema.org/",
		ul: "http://underlay.mit.edu/ns#",
	},
	"@type": "ul:Query",
	"@graph": {
		"@type": "Volcano",
		name: {},
		smokingAllowed: {},
	},
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

alpha.use(log)

const { protocol } = alpha.protocols["cbor-ld"]

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

	beta.use(
		Query([
			{
				schema: volcanoQuerySchema,
				handler(peer, message, next) {
					console.log(peer, message, JSON.stringify(message.query.results))
				},
			},
		])
	)

	beta.use((peer, { store }, next) => {
		console.log("beta: received a non-volcano-query from peer", peer)
		fromStore(store, (err, doc) => {
			if (err) {
				console.error(err)
			} else {
				console.log("beta: echoing non-volcano-query back to sender")
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
				console.log("sending messages from alpha to beta")
				alpha.send(betaId, protocol, message)
				alpha.send(betaId, protocol, { "http://foo.bar": "BAZ" })
			}, 2000)
		}
	})
})
