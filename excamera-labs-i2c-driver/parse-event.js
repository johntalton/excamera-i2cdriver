const mattched = value => ({ when: () => mattched(value), value: () => value })

const match = eventByte => ({
	when: (matchByte, value) => 
		matchByte === eventByte ? mattched(value) : match(eventByte),
	value: () => { throw new Error('unmatched byte') }
})


export class CaptureEventParser {
	static parseEventByte(eventByte) {
		return match(eventByte)
			.when(0x0, 'idle')
			.when(0x1, 'start')
			.when(0x2, 'stop')
			// 3 -7
			.when(0x8, '000')
			.when(0x9, '001')
			.when(0xa, '010')
			.when(0xb, '011')
			.when(0xc, '100')
			.when(0xd, '101')
			.when(0xe, '110')
			.when(0xf, '111')
			.value()
	}
}
