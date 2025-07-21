const matched = value => ({ when: () => matched(value), value: () => value })

const match = eventByte => ({
	when: (matchByte, value) =>
		matchByte === eventByte ? matched(value) : match(eventByte),
	value: () => { throw new Error('unmatched byte: ' + eventByte) }
})

export class CaptureEventParser {
	static _parseEventByte(eventByte) {
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


	static parseEventByte(eventByte) {
		const table = [
			{ eventByte: 0x0, name: 'idle', idle: true },
			{ eventByte: 0x1, name: 'start', start: true },
			{ eventByte: 0x2, name: 'stop', stop: true },
			// 3 -7
			{ eventByte: 0x8, name: '000', value: 0b000, data: true },
			{ eventByte: 0x9, name: '001', value: 0b001, data: true },
			{ eventByte: 0xa, name: '010', value: 0b010, data: true },
			{ eventByte: 0xb, name: '011', value: 0b011, data: true },
			{ eventByte: 0xc, name: '100', value: 0b100, data: true },
			{ eventByte: 0xd, name: '101', value: 0b101, data: true },
			{ eventByte: 0xe, name: '110', value: 0b110, data: true },
			{ eventByte: 0xf, name: '111', value: 0b111, data: true }
		]

		return table.find(item => item.eventByte === eventByte)
	}
}


