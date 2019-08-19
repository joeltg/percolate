/**
 * This example demonstrates the Route middleware, which wraps an HTTP interface around the Shape middleware.
 *
 * This example creates two parallel Underlay nodes, alpha and beta.
 * Alpha has no bootstrap peers and uses a handler that logs every message to the console.
 * Beta has alpha as a bootstrap peer and has two message handlers.
 * The first uses to Route middleware to handle messages whose *default graph* validates ./volcano.shex.
 * If a message validates, the route middleware will POST a JSON-LD encoding of the message to the configured route.
 * The second - invoked after Route if the message doesn't validate - echoes the message back to the sender.
 * After both nodes are initialized, alpha sends two messages to beta.
 * The first message validates ./volcano.shex.
 * The second message does not.
 */

const http = require("http")
const path = require("path")
const fs = require("fs-extra")
const URL = require("url")

const Percolator = require("../../index.js")
const log = require("../../tools/log.js")
const Route = require("../../tools/route.js")
const { fromStore } = require("../../utils.js")

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

	beta.use(Route([{ schema, url: "http://localhost:6000/wow" }]))

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

	beta.start((err, betaId) => {
		if (err) {
			console.error(err)
		} else {
			console.log("beta:", betaId)
			setTimeout(() => {
				console.log("sending message from alpha to beta")
				alpha.send(betaId, protocol, message)
				alpha.send(betaId, protocol, { "http://foo.bar": "BAZ" })
			}, 2000)
		}
	})
})

http
	.createServer((req, res) => {
		if (req.method === "POST") {
			console.log("we really got something here", req.url)
			const { pathname } = URL.parse(req.url)
			console.log(req.headers)
			if (req.headers["content-type"] !== "application/ld+json") {
				res.statusCode = 415
			} else if (pathname !== "/wow") {
				res.statusCode = 400
			} else {
				res.statusCode = 200
			}
		} else {
			res.statusCode = 405
		}
		res.end()
	})
	.listen(6000, err => console.log("the server is listening", err))
