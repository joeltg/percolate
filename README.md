# percolate

Percolate is [express](https://github.com/expressjs/express) for the decentralized semantic web.

It's a minimal [Underlay](https://underlay.mit.edu/) node that exposes a simple API for attaching message handlers to a middleware stack.

It's built on [IPFS](https://github.com/ipfs/js-ipfs) and [libp2p](https://github.com/libp2p/js-libp2p), and uses [PeerId](https://github.com/libp2p/js-peer-id) for identifiers.

Check out the [examples](examples/). They rely on current, unpublished changes to [shex.js](https://github.com/shexSpec/shex.js) so you have to `git clone` that repo into the same folder that the `percolate` repo is in (siblings).
