
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
	const { setAddress, countBytes } = info

	if(setAddress) { options.address = event.value }
	if(countBytes) { options.byteCount += 1 }
}

export async function* stateMachineStream(eventStream, options) {
	for await (const event of eventStream) {

		const info = await validateEvent(event, options)

		options.state = info.target

		await takeActions(event, info, options)

		yield {
			state: options.state,
			address: options.address
		}
	}
}
