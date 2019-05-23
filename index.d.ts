export = Percolator

type N3Store = any
type PeerInfo = any
type PeerId = any
type Connection = any

declare class Percolator {
	static protocol: string
	static matchProtocol(
		protocol: string,
		sourceProtocol: string,
		callback: (err: Error, match: boolean) => void
	): void

	static ShExParser: any

	static canonize(
		data: JsonLd.Graph,
		callback: (err: Error, canonized: string) => void
	): void

	static parse(
		data: string,
		callback: (err: Error, store: N3Store) => void
	): void

	constructor(repo: string, init: boolean, userConfig: {})

	private handlePeerConnect(peer: PeerInfo)
	private handleProtocol(protocol: string, connection: Connection)
	private connect(peerInfo: PeerInfo, connection: Connection)
	private next(peer: string, store: N3Store, index: number)
	private handle(
		handler: (peer: string, store: N3Store, next: () => void) => void
	)

	public shape(
		schema: string | {},
		start?: string,
		handler: (peer: string, store: N3Store, next: () => void) => void
	)

	// public shape(
	// 	schema: string | {},
	// 	handler: (peer: string, store: N3Store, next: () => void) => void
	// )

	public start(callback: () => void)
	public send(peer: string, message: JsonLd.Graph)
}
