const pull = require("pull-stream/pull")
const cbor = require("cbor")
const jsonld = require("jsonld")

const asyncMap = require("pull-stream/throughs/async-map")
const { transform } = require("stream-to-pull-stream")

const { format } = require("../utils")

const protocol = "/ul/0.1.1/cbor-ld"

function canonize(data, cb) {
	jsonld.canonize(data, { format, algorithm: "URDNA2015" }, cb)
}

const encode = () => transform(new cbor.Encoder())
const decode = () => pull(transform(new cbor.Decoder()), asyncMap(canonize))

module.exports = ({ ipfs }) => {
	jsonld.documentLoader = Loader(ipfs)
	return { protocol, encode, decode }
}
