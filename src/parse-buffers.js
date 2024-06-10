import { PULLUP_LOOKUP } from './defs.js'

export function* range(start, end) {
	yield start
	if(start === end) { return }
	yield *range(start + 1, end)
}

function assertAtLeastByteLength(buffer, length) {
	if(buffer.byteLength < length) { throw new Error('invalid byte length - short') }
}

function assertNonZeroByteLength(buffer) {
	if(buffer.byteLength <= 0) { throw new Error('zero length buffer') }
}

function assertBytesRead(bytesRead, target) {
	if(bytesRead !== target) { throw new Error('invalid byte length') }
}

export class ResponseBufferParser {
	/** @param {number} value  */
	static _parsePullup(value) {

		const PULL_UP_MASK = 0b111

		const sda = value & PULL_UP_MASK
		const scl = (value >> 3) & PULL_UP_MASK
		return {
			value,
			sda: PULLUP_LOOKUP[sda],
			sdaValue: sda,
			scl: PULLUP_LOOKUP[scl],
			sclValue: scl
		}
	}

		/**
	 * @param {Object} readResult
	 * @param {ArrayBufferLike|ArrayBufferView} readResult.buffer
	 * @param {number} readResult.bytesRead
	 */
	static parseTransmitStatusInfo({ bytesRead, buffer }) {
		const decoder = new TextDecoder()
		const str = decoder.decode(buffer)

		const [
			identifier,
			serial,
			uptime,
			voltage,
			current,
			temperature,
			mode,
			sda,
			scl,
			speed,
			pullups,
			crc
		] = str.slice(1, -1).split(' ')

		return {
			identifier,
			serial,
			uptime: parseInt(uptime, 10),
			voltage: parseFloat(voltage),
			current: parseFloat(current),
			temperature: parseFloat(temperature),
			mode,
			sda: parseInt(sda, 2),
			scl: parseInt(scl, 2),
			speed: parseInt(speed, 10),
			pullups: ResponseBufferParser._parsePullup(parseInt(pullups, 16)),
			crc: parseInt(crc, 16) //  CRC-16-CCITT
		}
	}

		/**
	 * @param {Object} readResult
	 * @param {ArrayBufferLike|ArrayBufferView} readResult.buffer
	 * @param {number} readResult.bytesRead
	 */
	static parseEchoByte({ bytesRead, buffer }) {
		assertNonZeroByteLength(buffer)
		assertBytesRead(bytesRead, 1)

		const u8 = ArrayBuffer.isView(buffer) ?
			new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new Uint8Array(buffer)

		return u8[0]
	}

		/**
	 * @param {Object} readResult
	 * @param {ArrayBufferLike|ArrayBufferView} readResult.buffer
	 * @param {number} readResult.bytesRead
	 */
	static parseStart({ bytesRead, buffer }) {
		assertAtLeastByteLength(buffer, 1)
		assertBytesRead(bytesRead, 1)

		const u8 = ArrayBuffer.isView(buffer) ?
			new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new Uint8Array(buffer)

		const RESERVED_5_MASK = 0b00110
		const ARBITRATION_MASK = 0b100
		const TO_MASK = 0b010
		const ACK_MASK = 0b001

		const [ b ] = u8

		const valid = ((b >> 3) & RESERVED_5_MASK) === RESERVED_5_MASK

		return {
			valid,
			arb: b & ARBITRATION_MASK,
			to: b & TO_MASK,
			ack: b & ACK_MASK
		}
	}

		/**
	 * @param {Object} readResult
	 * @param {ArrayBufferLike|ArrayBufferView} readResult.buffer
	 * @param {number} readResult.bytesRead
	 */
	static parseRegister({ bytesRead, buffer }) {
		assertAtLeastByteLength(buffer, 1)
		assertBytesRead(bytesRead, 1)

		const u8 = ArrayBuffer.isView(buffer) ?
			new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new Uint8Array(buffer)

		return u8[0]
	}

		/**
	 * @param {Object} readResult
	 * @param {ArrayBufferLike|ArrayBufferView} readResult.buffer
	 * @param {number} readResult.bytesRead
	 */
	static parseResetBus({ bytesRead, buffer }) {
		assertAtLeastByteLength(buffer, 1)
		assertBytesRead(bytesRead, 1)

		const u8 = ArrayBuffer.isView(buffer) ?
			new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new Uint8Array(buffer)

		const [ b ] = u8

		const SDA_MASK = 0b10
		const SCL_MASK = 0b01

		const sda = b & SDA_MASK
		const scl = b & SCL_MASK

		return {
			sda, scl
		}
	}

		/**
	 * @param {Object} readResult
	 * @param {ArrayBufferLike|ArrayBufferView} readResult.buffer
	 * @param {number} readResult.bytesRead
	 */
	static parseScan({ bytesRead, buffer }) {
		assertAtLeastByteLength(buffer, 112)
		assertBytesRead(bytesRead, 112)

		const u8 = ArrayBuffer.isView(buffer) ?
			new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new Uint8Array(buffer)

		const SCAN_START_ADDRESS = 0x08 // scan range 0x08 to 0x77
		const SCAN_END_ADDRESS = 0x77
		const count = SCAN_END_ADDRESS - SCAN_START_ADDRESS

		return range(0, count).map(index => {
				const result =  ResponseBufferParser.parseStart({ bytesRead: 1, buffer: u8.subarray(index, index + 1) })
				return {
					...result,
					dev: SCAN_START_ADDRESS + index
				}
			})
	}

	/**
	 * @param {Object} readResult
	 * @param {ArrayBufferLike|ArrayBufferView} readResult.buffer
	 * @param {number} readResult.bytesRead
	 */
	static parseInternalStatus({ bytesRead, buffer }) {

		const decoder = new TextDecoder()
		const str = decoder.decode(buffer)

		// id ds sp SMB0CF SMB0CN T2 T3 IE EIE1 P0 P0MDIN P0MDOUT P1 P1MDIN P1MDOUT P2 P2MDOUT"

		const [
			id, ds, sp, smb0cf, smb0cn, t2, t3, ie, eie1,
			p0, p0mdin, p0mdout, p1, p1mdin, p1mdout, p2, p2mdout,
			convs
		] = str.slice(1, -1).split(' ').map(hex => parseInt(hex, 16))

		return {
			id, ds, sp, smb0cf, smb0cn, t2, t3, ie, eie1,
			p0, p0mdin, p0mdout, p1, p1mdin, p1mdout, p2, p2mdout,
			convs
		}
	}
}
