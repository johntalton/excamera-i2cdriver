const NOOP = [ 'idle', 'start', 'stop' ]

function decodeBytes(eAccumulator) {
	const [ fe, se, te ] = eAccumulator
	const f = fe.value
	const s = se.value
	const t = te.value

	const value = ((f & 0b111) << 5) | ((s & 0b111) << 2) | ((t >> 1) & 0b11)
	const acked = (t & 0b1) === 0

	return { value, acked }
}

export async function* normalizedEventStream(eventStream) {
	let eAccumulator = []

	for await(const event of eventStream) {
		if(NOOP.includes(event.name)) {
			//console.log(eAccumulator.length)
			yield event
			continue
		}

		if(event.data !== true) { throw new Error('what') }

		//console.log('accumiulate')
		eAccumulator.push(event)

		if(eAccumulator.length < 3) {}
		else if(eAccumulator.length === 3) {
			console.log('flush accuulated')
			const { value, acked } = decodeBytes(eAccumulator)
			const cachedEA = eAccumulator
			eAccumulator = []

			yield { name: 'data', value, data: true, events: cachedEA }
			yield { name: (acked ? 'ack' : 'nack') }
		}
		else {
			throw new Error('buffered too much')
		}
	}
}
