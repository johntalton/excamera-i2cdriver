import { ResponseBufferPasrser } from './parse-buffers.js'

export const EXCAMERA_LABS_VENDOR_ID = 0x0403
export const EXCAMERA_LABS_PRODUCT_ID = 0x6015
export const EXCAMERA_LABS_MINI_PRODUCT_ID = 0x6015

const COMMAND_MASK_READ_NACK_FINAL = 0x80
const COMMAND_MASK_WRITE = 0xc0

//
const COMMAND_TRANSMIT_STATUS_INFO = 0x3f // '?'
const COMMAND_TRANSMIT_INTERNAL_STATE = 0x4a // 'J'
const COMMAND_ECHO_BYTE = 0x65 // 'e'

const COMMAND_SET_SPEED_100 = 0x31 // '1'
const COMMAND_SET_SPEED_400 = 0x34 // '4'
//
const COMMAND_START = 0x73 // 's'
const COMMAND_READ_ACK_ALL = 0x61 // 'a'
const COMMAND_STOP = 0x70 // 'p'
const COMMAND_RESET_BUS = 0x78 //'x'
const COMMAND_READ_REGISTER = 0x72 // 'r'
const COMMAND_SCAN = 0x64 // 'd'

//
const COMMAND_MONITOR_ENTER_MODE = 0x6d // 'm'
const COMMAND_MONITOR_EXIT_MODE = 0x20 // ' '

//
const COMMAND_CAPTURE_ENTER_MODE = 0x63 // 'c'

//
const COMMAND_BITBANG_ENTER_MODE = 0x62 // 'b'
const COMMAND_BITBANG_CONTROL = 0x62 // 'b'
const COMMAND_BITBANG_END_COMMAND = 0x40 // @
const COMMAND_BITBANG_EXIT_MODE = 0x69 // 'i'

//
const COMMAND_SET_PULLUP_CONTROL = 0x75 // 'u'

//
const COMMAND_REBOOT = 0x5f // '_'

//
const COMMAND_EFF = 0x66 // 'f'
const COMMAND_UHOO = 0x76 // 'v'
const COMMAND_DUBU = 0x77 // 'w'



const COMMAND_REPLY_LENGTH_NONE = 0
const COMMAND_REPLY_LENGTH_SINGLE_BYTE = 1
const COMMAND_REPLY_LENGTH_SCAN = 112
const COMMAND_REPLY_LENGTH_TRANSMIT_STATUS_INFO = 80
const COMMAND_REPLY_LENGTH_INTERNAL_STATE = 80


export class ExcameraLabsI2CDriver {
	static from({ port }) {
		return {
			//
			start: async (dev, readMode) => ExcameraLabsI2CDriver.start(port, dev, readMode),
			stop: async () => ExcameraLabsI2CDriver.stop(port),
			readACKAll: async (count) => ExcameraLabsI2CDriver.readACKAll(port, count),
			readNACKFinal: async (count) => ExcameraLabsI2CDriver.readNACKFinal(port, count),
			write: async (count, bufferSource) => ExcameraLabsI2CDriver.write(port, count, bufferSource),

			readRegister: async (dev, addr, count) => ExcameraLabsI2CDriver.readRegister(port, dev, addr, count),

			resetBus: async () => ExcameraLabsI2CDriver.resetBus(port),

			_transmitStatusInfo: async () => ExcameraLabsI2CDriver.transmitStatusInfo(port),
		}
	}

	static controlFrom({ port }) {
		return {
			//
			reboot: async () => ExcameraLabsI2CDriver.reboot(port),

			//
			transmitStatusInfo: async () => ExcameraLabsI2CDriver.transmitStatusInfo(port),
			internalState: async () => ExcameraLabsI2CDriver.internalState(port),
			echoByte: async b => ExcameraLabsI2CDriver.echoByte(port, b),

			//
			setPullupControls: async (sda, scl) => ExcameraLabsI2CDriver.setPullupControls(port, sda, scl),
			setSpeed: async speed => ExcameraLabsI2CDriver.setSpeed(port, speed),
			resetBus: async () => ExcameraLabsI2CDriver.resetBus(port),
			scan: async () => ExcameraLabsI2CDriver.scan(port),

			//
			enterMonitorMode: async () => ExcameraLabsI2CDriver.enterMonitorMode(port),
			exiterMonitorMode: async () => ExcameraLabsI2CDriver.exiterMonitorMode(port),

			//
			enterCaptureMode: async () => ExcameraLabsI2CDriver.enterCaptureMode(port),

			//
			enterBitbangMode: async () => ExcameraLabsI2CDriver.enterBitbangMode(port),
			exitBitbangMode: async () => ExcameraLabsI2CDriver.foexitBitbangModeo(port),
			sendBitbangCommand: async command => ExcameraLabsI2CDriver.sendBitbangCommand(port, command),
			endBitbangCommand: async () => ExcameraLabsI2CDriver.endBitbangCommand(port),
		}
	}


	static async #streamChunkRead(defaultReader, recvLength) {
		const timer = setTimeout(() => {
			console.log('timeout')
			defaultReader.cancel()
		}, 2000)

		const acc = []
		const accSize = () => {
			return acc.map(a => a.length).reduce((sum, length) => sum += length, 0)
		}

		while(true) {
			// console.log('await read')
			const { value, done } = await defaultReader.read()

			if(done) {
				// console.log('DONE', value)
				break
			}

			//console.log('accumulate value', value, accSize(), recvLength)
			acc.push([...value])

			if(accSize() >= recvLength) {
				// console.log('OVERSIZE')
				break
			}
		}

		clearTimeout(timer)

		//console.log({ acc })
		return Uint8Array.from(acc.reduce((flat, a) => {
			return [ ...flat, ...a ]
		}, []))
	}

	static async #streamChunkRead_Alt(defaultReader, recvLength) {

			const chunkRead = async (prevSize, { value, done }) => {
				console.log('chunkRead', value, done)
				if(done) {
					console.log('exit read on done')
					return value
				}

				const readSize = prevSize + value.byteLength
				if(readSize >= recvLength) {
					console.log('exit read on size')
					return value
				}

				console.log('reading chunk:', done, readSize)
				return Uint8Array.from([ ...value, ...await chunkRead(readSize, await defaultReader.read()) ])
			}

			console.log('read first')

			const firstRead = await defaultReader.read()
			console.log('first chunk read', firstRead)
			return await chunkRead(0, firstRead)
	}


	static async sendRecvTextCommand(port, textCommand, sendBuffer, recvLength) {
		const encoder = new TextEncoder()
		const encoded = encoder.encode(textCommand, { stream: false })
		if(encoded.byteLength !== 1) { throw new Error('unknown text command')}

		const command = encoded[0]
		return this.sendRecvCommand(port, command, sendBuffer, recvLength)
	}

	static async sendRecvCommand(port, command, sendBuffer, recvLength) {
		// console.log('reader state', port.readable.locked, command, sendBuffer, recvLength)
		if(port.readable.locked) {
			console.warn('locked reader ...')

			throw new Error('locked reader')
		}

		const defaultWriter = port.writable.getWriter()
		const defaultReader = port.readable.getReader()

		try {
			//
			// console.log('write encoded command', command)
			await defaultWriter.ready

			if(sendBuffer) {
				const sb8 = ArrayBuffer.isView(sendBuffer) ?
					new Uint8Array(sendBuffer.buffer, sendBuffer.byteOffset, sendBuffer.byteLength) :
					new Uint8Array(sendBuffer)

				// console.log('sending buffer', sb8)

				await defaultWriter.write(Uint8Array.from([ command, ...sb8 ]))
			}
			else {
				await defaultWriter.write(Uint8Array.from([ command ]))
			}

			//
			// console.log('close writer')
			// await defaultWriter.ready
			// await defaultWriter.close()

			// console.log({ recvLength })
			if(recvLength === undefined || recvLength <= 0) {
				// console.log('expect zero')
				return Uint8Array.from([])
			}

			return await ExcameraLabsI2CDriver.#streamChunkRead(defaultReader, recvLength)
		}
		catch(e) {
			console.warn(e)
			return Uint8Array.from([])
		}
		finally {
			// console.log('finally')
			await defaultReader.releaseLock()
			await defaultWriter.releaseLock()
		}
	}

	static async transmitStatusInfo(port) {
		return ResponseBufferPasrser.parseTransmitStatusInfo(await ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_TRANSMIT_STATUS_INFO, undefined, COMMAND_REPLY_LENGTH_TRANSMIT_STATUS_INFO))
	}

	static async internalState(port) {
		return ResponseBufferPasrser.parseInternalStatus(await ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_TRANSMIT_INTERNAL_STATE, undefined, COMMAND_REPLY_LENGTH_INTERNAL_STATE))
	}

	static async echoByte(port, b) {
		return ResponseBufferPasrser.parseEchoByte(await ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_ECHO_BYTE, Uint8Array.from([ b ]), COMMAND_REPLY_LENGTH_SINGLE_BYTE))
	}

	static async setSpeed(port, speed) {
		if(![1, 100, 4, 400].includes(speed)) { throw new Error('invalid speed') }
		const speedCommand = (speed === 4 || speed === 400) ? COMMAND_SET_SPEED_400 : COMMAND_SET_SPEED_100
		return ExcameraLabsI2CDriver.sendRecvCommand(port, speedCommand, undefined, COMMAND_REPLY_LENGTH_NONE)
	}

	static async start(port, dev, readMode) {
		const b = (dev << 1) | (readMode ? 1 : 0)
		return ResponseBufferPasrser.parseStart(await ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_START, Uint8Array.from([ b ]), COMMAND_REPLY_LENGTH_SINGLE_BYTE))
	}

	static async readNACKFinal(port, count) {
		const count_mask = 0b0011_1111

		const countMinusOne = count - 1

		const valid = (countMinusOne & count_mask) === countMinusOne
		if(!valid) { throw new Error('invalid count') }

		const command = COMMAND_MASK_READ_NACK_FINAL | countMinusOne

		return ExcameraLabsI2CDriver.sendRecvCommand(port, command, undefined, count)
	}

	static async write(port, count, bufferSource) {
		// console.log('---i2c-driver:write', count, bufferSource)

		const count_mask = 0b00111111

		const countMinusOne = count - 1

		const valid = (countMinusOne & count_mask) === countMinusOne
		if(!valid) { throw new Error('invalid count') }

		const command = COMMAND_MASK_WRITE | countMinusOne

		return ResponseBufferPasrser.parseStart(await ExcameraLabsI2CDriver.sendRecvCommand(port, command, bufferSource, COMMAND_REPLY_LENGTH_SINGLE_BYTE))
	}

	static async readACKAll(port, count) {
		return ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_READ_ACK_ALL, Uint8Array.from([ count ]), count)
	}

	static async stop(port) {
		return ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_STOP, undefined, COMMAND_REPLY_LENGTH_NONE)
	}

	static async resetBus(port) {
		return ResponseBufferPasrser.parseResetBus(await ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_RESET_BUS, undefined, COMMAND_REPLY_LENGTH_SINGLE_BYTE))
	}

	static async readRegister(port, dev, addr, count) {
		const data = Uint8Array.from([ dev, addr, count ])
		return ResponseBufferPasrser.parseRegister(await ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_READ_REGISTER, data, count))
	}

	static async scan(port) {
		return ResponseBufferPasrser.parseScan(await ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_SCAN, undefined, COMMAND_REPLY_LENGTH_SCAN))
	}

	static async enterMonitorMode(port) {
		return ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_MONITOR_ENTER_MODE, undefined, COMMAND_REPLY_LENGTH_NONE)
	}

	static async exitMonitorMode(port) {
		return ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_MONITOR_EXIT_MODE, undefined, COMMAND_REPLY_LENGTH_NONE)
	}

	static async enterCaptureMode(port) {
		return ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_CAPTURE_ENTER_MODE, undefined, COMMAND_REPLY_LENGTH_NONE)
	}

	static async enterBitbangMode(port) {
		return ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_BITBANG_ENTER_MODE, undefined, COMMAND_REPLY_LENGTH_NONE)
	}

	static async sendBitbangCommand(port, command) {

		//
		const controlSequence = 0
		return ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_BITBANG_CONTROL, Int8Array.from([ controlSequence ]), COMMAND_REPLY_LENGTH_NONE)
	}

	static async endBitbangCommand(port) {
		return ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_BITBANG_END_COMMAND, undefined, COMMAND_REPLY_LENGTH_NONE)
	}

	static async exitBitbangMode(port) {
		return ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_BITBANG_EXIT_MODE, undefined, COMMAND_REPLY_LENGTH_NONE)
	}

	static async setPullupControls(port, sda, scl) {
		const b = (scl << 3) | sda
		return ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_SET_PULLUP_CONTROL, Int8Array.from([ b ]), COMMAND_REPLY_LENGTH_NONE)

	}

	static async reboot(port) {
		return ExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_REBOOT, undefined, COMMAND_REPLY_LENGTH_NONE)
	}
}
