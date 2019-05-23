# percolate

Percolate is [express](https://github.com/expressjs/express) for the decentralized semantic web.

It's a minimal [Underlay](https://underlay.mit.edu/) node that exposes a simple API for matching [JSON-LD frames](https://w3c.github.io/json-ld-framing/) to callback handlers.

It's built on [IPFS](https://github.com/ipfs/js-ipfs) and [libp2p](https://github.com/libp2p/js-libp2p), and uses [PeerId](https://github.com/libp2p/js-peer-id) for identifiers.

```javascript
const Percolate = require("./percolate/index.js")

const prcltr = new Percolate()

// Handle every message that has a node with an rdf:type of schema:Person
prcltr.frame(
	peerId => true, // optional source predicate that gets passed the sender PeerId *instance*
	{ "@type": "http://schema.org/Person" },
	(source, message, next) => {
		// message is a JSON-LD document
		// source is a base-58-encoded PeerId
		// next is a function of no arguments that invokes the next matching handler

		// Send messages with prcltr.send(id, message)
		// This will echo the received message back to the sender.
		prcltr.send(source, message)
	}
)

prcltr.start(() => console.log("hooray!"))
```
