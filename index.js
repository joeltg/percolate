const { N3 } = require("../shex.js")

const jsonld = require("jsonld")
const cbor = require("cbor")

const pull = require("pull-stream/pull")
const Pushable = require("pull-pushable")
const drain = require("pull-stream/sinks/drain")
const map = require("pull-stream/throughs/map")
const asyncMap = require("pull-stream/throughs/async-map")
const { transform } = require("stream-to-pull-stream")

const IPFS = require("ipfs")

const config = require("./config.js")
const libp2p = require("./libp2p.js")

const { PeerId } = IPFS

// Underlay Protocol String
const protocol = "/ul/0.1.1/cbor-ld"

class Percolator {
	static matchProtocol(protocol, sourceProtocol, callback) {
		callback(null, protocol === sourceProtocol)
	}

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

		this.ready = new Promise((resolve, reject) => {
			this.ipfs.on("ready", resolve)
		})
	}

	handlePeerConnect(peerInfo) {
		if (peerInfo.protocols.has(protocol)) {
			this.ipfs.libp2p.dialProtocol(peerInfo, protocol, (err, connection) => {
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

	/**
	 * Invoke the next handler in the stack.
	 *
	 * @callback next
	 */

	/**
	 *
	 * @callback {handler}
	 * @param {string} peer - The sender's 58-encoded PeerId
	 * @param {N3.Store} store
	 * @param {next} next
	 */

	/**
	 *
	 * @param {handler} handler
	 */
	use(handler) {
		this.handlers.push(handler)
	}

	/**
	 *
	 * @callback {onStart}
	 * @param {Error} err
	 * @param {PeerId} identity
	 */

	/**
	 *
	 * @param {onStart} callback
	 */
	start(callback) {
		this.ready.then(() =>
			this.ipfs.start(err => {
				if (err) {
					callback(err)
				} else {
					this.ipfs.libp2p.on("peer:connect", peerInfo =>
						this.handlePeerConnect(peerInfo)
					)
					this.ipfs.libp2p.handle(
						protocol,
						(protocol, connection) => this.handleProtocol(protocol, connection),
						Percolator.matchProtocol
					)
					this.ipfs.id((err, identity) => {
						if (identity) {
							this.id = identity.id
						}
						callback(err, identity)
					})
				}
			})
		)
	}

	/**
	 *
	 * @param {string} peer - The sender's 58-encoded PeerId
	 * @param {Object} message - a JSON-LD document
	 */
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
