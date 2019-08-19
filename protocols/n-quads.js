const jsonld = require("jsonld")
const varint = require("varint")

const protocol = "/ul/0.1.1/n-quads"

const { format } = require("../utils")

// This encodes and decodes unsigned varint-delimited messages as a pull-stream.
// This is probably highly re-usable and should be split off into ints own repo.

// This is called callback hell, folks!
const encode = () => read => (end, cb) => {
	read(end, (end, data) => {
		if (data !== null) {
			jsonld.toRDF(
				data,
				{ format, produceGeneralizedRdf: true },
				(err, res) => {
					if (err) {
						cb(err, null)
					} else {
						const length = varint.encodingLength(res.length)
						const buffer = Buffer.from({ length })
						varint.encode(res.length, buffer)
						cb(end, Buffer.concat([buffer, Buffer.from(res)]))
					}
				}
			)
		} else {
			cb(end, null)
		}
	})
}

// Zoinkssssss
const decode = () => read => (end, cb) => {
	let length = null
	let buffer = Buffer.from([])
	const readBack = (end, data) => {
		if (Buffer.isBuffer(data)) {
			buffer = Buffer.concat([buffer, data], buffer.length + data.length)
			if (length === null) {
				try {
					length = varint.decode(buffer)
				} catch (err) {
					if (err instanceof RangeError) {
						return read(end, readBack)
					} else {
						return cb(err, null)
					}
				}
				buffer = buffer.slice(varint.decode.bytes)
			}
			if (buffer.length >= length) {
				const bytes = buffer.slice(0, length)
				buffer = buffer.slice(length)
				return cb(end, bytes)
			} else {
				return read(end, readBack)
			}
		} else {
			cb(end, null)
		}
	}

	read(end, readBack)
}

module.exports = _ => ({ protocol, encode, decode })
