
async function validateEvent(event, options) {
	const { state, machine } = options

	const machineState = machine[state]
	if(machineState === undefined) { throw new Error('undefined current state') }

	const info = machineState[event.name] ?? machineState['*']


	if(info === undefined) {
		console.log('validateEvent', state, event, info)
		throw new Error('unknown target state')
	}

	return info
}

async function takeActions(event, info, options) {
	const {
		openTransaction,
		clearAddress,
		setAddress,
		bufferBytes,
		flushBytes,
		closeTransaction
	} = info

	if(openTransaction) {
		// Hi
	}

	if(clearAddress) {
		options.address = undefined
		options.mode = undefined
	}

	if(setAddress) {
		options.address = event.value >> 1
		options.mode = event.value & 0b1 === 1 ? 'read' : 'write'
	}

	const source = options.bytesAccumulator ?? []
	if(bufferBytes) { options.bytesAccumulator = [ ...source, event.value ] }

	if(flushBytes) {
		options.buffer = Uint8Array.from(options.bytesAccumulator)
		options.bytesAccumulator = []
	}

	if(closeTransaction) {
		if(options.bytesAccumulator.length > 0) { throw new Error('unflushed buffer') }
		// Bye
	}
}

export async function* stateMachineStream(eventStream, options) {
	for await (const event of eventStream) {

		const info = await validateEvent(event, options)

		options.state = info.target

		await takeActions(event, info, options)

		yield {
			state: options.state,
			address: options.address,
			mode: options.mode,
			buffer: options.buffer
		}

		options.buffer = undefined
	}
}
