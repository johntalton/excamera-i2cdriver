
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
		openTransaction, closeTransaction,
		setAddress, clearAddress,
		bufferBytes, flushBytes
	} = info


	if(openTransaction) {}
	if(closeTransaction) {}


	if(setAddress) {
		options.address = event.value >> 1
		options.mode = event.value & 0b1 === 1 ? 'read' : 'write'
	}

	if(clearAddress) {
		options.address = undefined
		options.mode = undefined
	}

	const source = options.tempBuffer ?? []
	if(bufferBytes) { options.tempBuffer = [ ...source, event.value ] }

	if(flushBytes) {
		console.log('flush', options.tempBuffer)
		options.buffer = Uint8Array.from(options.tempBuffer)
		options.tempBuffer = []
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
