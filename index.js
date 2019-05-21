const IPFS = require("ipfs")

const cbor = require("cbor")
const jsonld = require("jsonld")

const pull = require("pull-stream/pull")
const Pushable = require("pull-pushable")
const drain = require("pull-stream/sinks/drain")
const { transform } = require("stream-to-pull-stream")

const config = require("./config.js")
const libp2p = require("./libp2p.js")

const { PeerId } = IPFS

class Percolator {
	// Options for jsonld.frame
	static frame = { processingMode: "json-ld-1.1", omitGraph: false }
	// Options for jsonld.canonize
	static canonize = { algorithm: "URDNA2015", format: "application/n-quads" }
	// Underlay Protocol String
	static protocol = "/ul/0.1.1/cbor-ld"
	static matchProtocol(protocol, sourceProtocol, callback) {
		callback(null, protocol === sourceProtocol)
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

		this.ipfs.on("ready", () => {
			this.ipfs.libp2p.on("peer:connect", this.handlePeerConnect)
			this.ipfs.libp2p.handle(
				Percolator.protocol,
				this.handleProtocol,
				Percolator.matchProtocol
			)
		})
	}

	async next(doc, peerId, index) {
		if (isNaN(index)) index = 0
		const { frame, callback } = this.handlers[index]
		const framed = await jsonld.frame(doc, frame, Percolator.frame)
		if (framed["@graph"].length > 0) {
			callback(framed, peerId, () => this.next(doc, peerId, i + 1))
		} else {
			this.next(doc, peerId, index + 1)
		}
	}

	connect(peer, connection) {
		const id = peer.id.toB58String()
		this.outbox[id] = Pushable()

		pull(
			this.outbox[id],
			transform(new cbor.Decoder()),
			connection,
			transform(new cbor.Encoder()),
			drain(doc => this.next(doc, id, 0), () => {})
		)
	}

	handleProtocol(_, connection) {
		connection.getPeerInfo((err, peer) => {
			if (err) console.error(err)
			else this.connect(peer, connection)
		})
	}

	handlePeerConnect(peer) {
		if (peer.protocols.has(protocol)) {
			this.ipfs.libp2p.dialProtocol(peer, protocol, (err, connection) => {
				if (err) console.error(err)
				else this.connect(peer, connection)
			})
		}
	}

	frame(frame, handler) {
		this.handlers.push({ frame, handler })
	}

	start(callback) {
		this.ipfs.start(callback)
	}

	send(peerId, message) {
		if (peerId instanceof PeerId) {
			peerId = peerId.toB58String()
		}

		if (this.outbox.hasOwnProperty(peerId)) {
			this.outbox[peerId].push(message)
		}
	}
}

if (require.main === module) {
	const percolator = new Percolator()
	percolator.start()
} else {
	module.exports = Percolator
}
