const http = require("http")
const path = require("path")
const fs = require("fs-extra")
const URL = require("url")

const Percolator = require("../../index.js")
const fromStore = require("../../tools/fromStore.js")
const Route = require("../../tools/route.js")

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

	beta.use(Route([{ schema, url: "http://localhost:6000/wow" }]))

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

http
	.createServer((req, res) => {
		if (req.method === "POST") {
			console.log("we really got something here", req.url)
			const { query, pathname } = URL.parse(req.url)
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
