
export async function* eventByteStream(byteStream) {
	for await(const b of byteStream) {
		yield (b >> 4 & 0xf)
		yield (b & 0xf)
	}
}
