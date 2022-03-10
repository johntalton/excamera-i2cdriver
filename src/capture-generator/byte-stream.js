function* range(start, end) {
	yield start
	if (start === end) return
	yield* range(start + 1, end)
}

export async function* byteStream(sourceBufferStream) {
	for await (const sourceBuffer of sourceBufferStream) {
		const dv = ArrayBuffer.isView(sourceBuffer) ?
			new DataView(sourceBuffer.buffer, sourceBuffer.byteOffset, sourceBuffer.byteLength) :
			new DataView(sourceBuffer)

		for (const idx of range(0, dv.byteLength - 1)) {
			yield dv.getUint8(idx)
		}
	}
}
