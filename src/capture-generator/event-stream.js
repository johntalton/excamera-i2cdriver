import { CaptureEventParser } from '../parse-event.js'

export async function* eventStream(eventByteStream) {
	for await(const eb of eventByteStream) {
		yield CaptureEventParser.parseEventByte(eb)
	}
}
