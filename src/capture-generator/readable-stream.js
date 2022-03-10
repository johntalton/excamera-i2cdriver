export async function* readableStream(defaultReader, options) {
	const { signal } = options

	while(true) {
		const { value, done } = await defaultReader.read()
		if(done) { return }
		yield value.buffer
	}
}
