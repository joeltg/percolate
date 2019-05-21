const TCP = require("libp2p-tcp")
const Bootstrap = require("libp2p-bootstrap")
const KadDHT = require("libp2p-kad-dht")
const Multiplex = require("libp2p-mplex")
const SECIO = require("libp2p-secio")

module.exports = {
	modules: {
		transport: [TCP],
		streamMuxer: [Multiplex],
		connEncryption: [SECIO],
		peerDiscovery: [Bootstrap],
		dht: KadDHT,
	},
	config: {
		peerDiscovery: {
			autoDial: true,
			bootstrap: { enabled: true },
		},
		relay: { enabled: false },
		dht: { enabled: true },
	},
}
