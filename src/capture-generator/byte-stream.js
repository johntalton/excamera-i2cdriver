function* range(start, end) {
	yield start
	if (start === end) return
	yield* range(start + 1, end)
}

export async function* byteStream(bufferSourceStream) {
	for await (const bufferSource of bufferSourceStream) {
		const dv = ArrayBuffer.isView(bufferSource) ?
			new DataView(bufferSource.buffer, bufferSource.byteOffset, bufferSource.byteLength) :
			new DataView(bufferSource)

		for (const idx of range(0, dv.byteLength - 1)) {
			yield dv.getUint8(idx)
		}
	}
}
