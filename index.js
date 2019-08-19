const EventEmitter = require("events")

const N3 = require("n3")
const ShExCore = require("shex-core")

const pull = require("pull-stream/pull")
const pushable = require("pull-pushable")
const drain = require("pull-stream/sinks/drain")
const asyncMap = require("pull-stream/throughs/async-map")

const IPFS = require("ipfs")

const config = require("./config.js")
const libp2p = require("./libp2p.js")

const cborLd = require("./protocols/cbor-ld.js")
const nQuads = require("./protocols/n-quads.js")

const { format } = require("./utils.js")

const { Buffer } = IPFS

class Percolator extends EventEmitter {
	constructor(repo, init, userConfig) {
		super()

		this.handlers = []
		this.protocols = [cborLd, nQuads]

		this.outbox = {}
		for (const { protocol } of this.protocols) {
			this.outbox[protocol] = {}
		}

		this.ipfs = new IPFS({
			repo: repo,
			init: init,
			start: false,
			relay: { enabled: false },
			preload: { enabled: false },
			config: Object.assign(config, userConfig),
			libp2p: libp2p,
		})

		this.persist = this.persist.bind(this)
		this.handlePeerConnect = this.handlePeerConnect.bind(this)
	}

	static matchProtocol(protocol, sourceProtocol, callback) {
		callback(null, protocol === sourceProtocol)
	}

	static parse({ data, hash, size }, callback) {
		const store = new N3.Store()
		const parser = new N3.StreamParser({ format, blankNodePrefix: "_:" })

		parser.on("error", err => callback(err))
		parser.on("data", quad => store.addQuad(quad))
		parser.on("end", () => {
			const graphs = {}
			store.forGraphs(graph => {
				const id = N3.DataFactory.internal.toId(graph)
				graphs[id] = new N3.Store()
				store.forEach(quad => graphs[id].addQuad(quad), null, null, null, graph)
			})
			const message = { store, graphs, hash, size }
			message.default = ShExCore.Util.makeN3DB(graphs[""])
			callback(null, message)
		})
		parser.end(data)
	}

	handlePeerConnect(info) {
		const peer = info.id.toB58String()
		console.log(this.id, "handlePeerConnect", peer)
		for (const { protocol, encode, decode } of this.protocols) {
			if (info.protocols.has(protocol)) {
				this.ipfs.libp2p.dialProtocol(info, protocol, (err, connection) => {
					if (err) {
						console.error(err)
						return
					} else {
						console.log(
							this.id,
							protocol,
							"handling peer connect after dialing"
						)
						this.handleConnection(info, protocol, encode, connection, decode)
					}
				})
			}
		}
	}

	handleProtocol(protocol, encode, connection, decode) {
		console.log(this.id, "handling the protocol", protocol)
		connection.getPeerInfo((err, info) => {
			if (err) {
				console.error(err)
			} else {
				console.log(this.id, protocol, info.id.toB58String())
				console.log(
					this.id,
					protocol,
					"handling protocol after getting peer info"
				)

				this.handleConnection(info, protocol, encode, connection, decode)
			}
		})
	}

	handleConnection(info, protocol, encode, connection, decode) {
		const peer = info.id.toB58String()
		console.log(this.id, "creating pushable", protocol, peer)
		this.outbox[protocol][peer] = pushable()
		pull(
			this.outbox[protocol][peer],
			encode(),
			connection,
			decode(),
			asyncMap(this.persist),
			asyncMap(Percolator.parse),
			drain(message => this.tick(peer, message, 0), () => {})
		)
	}

	persist(data, callback) {
		this.ipfs.add(Buffer.from(data), { pin: false }, (err, res) => {
			if (err) {
				callback(err)
			} else {
				const [{ hash, size }] = res
				callback(null, { data, hash, size })
			}
		})
	}

	tick(peer, message, index) {
		if (index < this.handlers.length) {
			const handler = this.handlers[index]
			const next = () => this.tick(peer, message, index + 1)
			handler(peer, message, next)
		}
	}

	/**
	 * Invoke the next handler in the stack.
	 *
	 * @callback next
	 */

	/**
	 *
	 * @callback handler
	 * @param {string} peer - The sender's base58-encoded PeerId
	 * @param {Object} message
	 * @param {N3.Store} message.store
	 * @param {Object.<string, N3.Store>} message.graphs
	 * @param {string} message.hash
	 * @param {number} message.size
	 * @param {next} next
	 */

	/**
	 *
	 * @param {handler} handler
	 */
	use(handler) {
		this.handlers.push(handler)
		return this
	}

	/**
	 *
	 * @callback onStart
	 * @param {Error} err
	 * @param {PeerId} identity
	 */

	/**
	 *
	 * @param {onStart} callback
	 */
	start(callback) {
		if (typeof callback !== "function") {
			callback = () => {}
		}

		this.ipfs.ready
			.then(() => this.ipfs.start())
			.then(() => {
				this.ipfs.libp2p.on("peer:connect", this.handlePeerConnect)
				for (const { protocol, encode, decode } of this.protocols) {
					this.ipfs.libp2p.handle(
						protocol,
						(_, connection) =>
							this.handleProtocol(protocol, encode, connection, decode),
						Percolator.matchProtocol
					)
				}
			})
			.then(() => this.ipfs.id())
			.then(identity => {
				this.id = identity.id
				callback(null, identity.id)
			})
			.catch(err => callback(err))
	}

	/**
	 *
	 * @param {string} peer - The sender's base58-encoded PeerId
	 * @param {string} protocol - The encoding protocol to use
	 * @param {Object} message - a JSON-LD document
	 */
	send(peer, protocol, message) {
		if (this.outbox.hasOwnProperty(protocol)) {
			if (this.outbox[protocol].hasOwnProperty(peer)) {
				return this.outbox[protocol][peer].push(message)
			}
		}
		console.error(`No connection to peer ${peer} on protocol ${protocol}`)
	}
}

if (require.main === module) {
	new Percolator().start()
} else {
	module.exports = Percolator
}
