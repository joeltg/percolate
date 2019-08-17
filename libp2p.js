const TCP = require("libp2p-tcp")
const Multiplex = require("pull-mplex")
const SECIO = require("libp2p-secio")
const KadDHT = require("libp2p-kad-dht")

module.exports = {
	modules: {
		transport: [TCP],
		streamMuxer: [Multiplex],
		connEncryption: [SECIO],
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
