# percolate

Percolate is [express](https://github.com/expressjs/express) for the decentralized semantic web.

It's a minimal [Underlay](https://underlay.mit.edu/) node that exposes a simple API for matching [JSON-LD frames](https://w3c.github.io/json-ld-framing/) to callback handlers.

It's built on [IPFS](https://github.com/ipfs/js-ipfs) and [libp2p](https://github.com/libp2p/js-libp2p), and uses [PeerId](https://github.com/libp2p/js-peer-id) for identifiers.

```javascript
const Percolate = require("./percolate/index.js")
const Shape = require("./percolate/tools/shape.js")

const prcltr = new Percolate()

// This ShEx schema validates nodes of rdf:type schema.org/Person
// that have a name, a birthday, and zero or more friends.
const schema = `
PREFIX s: <http://schema.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

start = @_:person

_:person {
	a [s:Person];
	s:name xsd:string;
	s:birthDate xsd:date;
  s:knows (IRI | @_:person)*
}
`

function handler(peer, store, result, next) {
	prcltr.send(peer, {})
}

prcltr.use(Shape([{ schema, handler }]))

prcltr.start(() => console.log("hooray!"))
```
