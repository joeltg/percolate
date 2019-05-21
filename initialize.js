const fs = require("fs")
const path = require("path")

const IPFS = require("ipfs")

const config = require("./config.js")

const index = process.argv[2]
const indices = process.argv.slice(3)
const indexTest = /^\d$/

if (
	process.argv.length < 3 ||
	!indexTest.test(index) ||
	!indices.every(index => indexTest.test(index))
) {
	throw new Error(
		"Must specifiy a peer index as the first command line argument"
	)
}

const repo = path.resolve(__dirname, "peers", index)

fs.mkdirSync(repo, { recursive: true })

// IPFS
const ipfs = new IPFS({
	repo: repo,
	init: { emptyRepo: true },
	start: false,
	config: config(index, indices),
})

ipfs.on("ready", async () => {
	const id = await ipfs.id()
	console.log(id)
	console.log("it's ready, chief")
	process.exit()
})
