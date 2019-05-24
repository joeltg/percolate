import JsonLd from "./jsonld"

export = Percolator

type N3Store = any
type PeerInfo = any
type PeerId = any
type Connection = any

type Next = () => void
type Handler = (peer: string, store: N3Store, next: Next) => void

declare class Percolator {
	static protocol: string
	private static matchProtocol(
		protocol: string,
		sourceProtocol: string,
		callback: (err: Error, match: boolean) => void
	): void

	private static canonize(
		data: JsonLd.Graph,
		callback: (err: Error, canonized: string) => void
	): void

	private static parse(
		data: string,
		callback: (err: Error, store: N3Store) => void
	): void

	constructor(repo: string, init: boolean, userConfig: {})

	private handlePeerConnect(peer: PeerInfo)
	private handleProtocol(protocol: string, connection: Connection)
	private connect(peerInfo: PeerInfo, connection: Connection)
	private next(peer: string, store: N3Store, index: number)

	public use(handler: Handler)

	public shape(schema: string | {}, start: string, handler: Handler)
	public shape(schema: string | {}, handler: Handler)

	public start(callback: Next)

	public send(peer: string, message: JsonLd.Graph)
}

// Tools
declare function Shape(
	routes: { schema: string | {}; start?: string; handler: Handler }[]
): Handler
