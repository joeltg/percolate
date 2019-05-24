const { N3 } = require("../shex.js")
const ShExParser = require("../shex.js/packages/shex-parser")
const ShExCore = require("../shex.js/packages/shex-core")

const jsonld = require("jsonld")
const cbor = require("cbor")

const pull = require("pull-stream/pull")
const Pushable = require("pull-pushable")
const drain = require("pull-stream/sinks/drain")
const asyncMap = require("pull-stream/throughs/async-map")
const { transform } = require("stream-to-pull-stream")

const IPFS = require("ipfs")

const config = require("./config.js")
const libp2p = require("./libp2p.js")

const { PeerId } = IPFS

class Percolator {
	// Underlay Protocol String
	static protocol = "/ul/0.1.1/cbor-ld"
	static matchProtocol(protocol, sourceProtocol, callback) {
		callback(null, protocol === sourceProtocol)
	}

	static ShExParser = ShExParser.construct()

	static canonize(data, callback) {
		jsonld.canonize(
			data,
			{ algorithm: "URDNA2015", format: "application/n-quads" },
			callback
		)
	}

	static parse(data, callback) {
		const store = new N3.Store()
		const parser = new N3.StreamParser({
			format: "application/n-quads",
			blankNodePrefix: "_:",
		})
		parser.on("end", () => callback(null, store))
		parser.on("error", err => callback(err))
		parser.on("data", quad => store.addQuad(quad))
		parser.end(data)
	}

	constructor(repo, init, userConfig) {
		this.outbox = {}
		this.handlers = []

		this.ipfs = new IPFS({
			repo: repo,
			init: init,
			start: false,
			relay: { enabled: false },
			preload: { enabled: false },
			config: Object.assign(config, userConfig),
			libp2p: libp2p,
		})

		this.libp2p = this.ipfs.libp2p

		this.ipfs.on("ready", () => {
			this.libp2p.on("peer:connect", this.handlePeerConnect)
			this.libp2p.handle(
				Percolator.protocol,
				this.handleProtocol,
				Percolator.matchProtocol
			)
		})
	}

	handlePeerConnect(peerInfo) {
		if (peerInfo.protocols.has(protocol)) {
			this.libp2p.dialProtocol(peerInfo, protocol, (err, connection) => {
				if (err) {
					console.error(err)
				} else {
					this.connect(peerInfo, connection)
				}
			})
		}
	}

	handleProtocol(_, connection) {
		connection.getPeerInfo((err, peerInfo) => {
			if (err) {
				console.error(err)
			} else {
				this.connect(peerInfo, connection)
			}
		})
	}

	connect(peerInfo, connection) {
		const peer = peerInfo.id.toB58String()
		this.outbox[peer] = Pushable()

		pull(
			this.outbox[peer],
			transform(new cbor.Encoder()),
			connection,
			transform(new cbor.Decoder()),
			asyncMap(Percolator.canonize),
			asyncMap(Percolator.parse),
			drain(store => this.next(peer, store, 0), () => {})
		)
	}

	next(peer, store, index) {
		if (index < this.handlers.length) {
			const handler = this.handlers[index]
			const next = () => this.next(peer, store, index + 1)
			handler(peer, store, next)
		}
	}

	use(handler) {
		this.handlers.push(handler)
	}

	shape(schema, start, handler) {
		if (typeof schema === "string") {
			schema = Percolator.ShExParser.parse(schema)
		}

		if (handler === undefined) {
			handler = start
			start = schema.start
		}

		const validator = ShExCore.Validator.construct(schema)
		this.handlers.push((peer, store, next) => {
			const db = ShExCore.Util.makeN3DB(store)
			const result = validator.validate(db, "_:b0", start)
			if (result.type === "Failure") {
				next()
			} else if (result.type === "ShapeTest") {
				handler(peer, store, next)
			}
		})
	}

	start(callback) {
		this.ipfs.start(callback)
	}

	send(peer, message) {
		if (peer instanceof PeerId) {
			peer = peer.toB58String()
		}
		if (this.outbox.hasOwnProperty(peer)) {
			this.outbox[peer].push(message)
		}
	}
}

if (require.main === module) {
	const percolator = new Percolator()
	percolator.start()
} else {
	module.exports = Percolator
}
