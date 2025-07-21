import {
	PULLUP_LOOKUP,
	COMMAND_REPLY_LENGTH_SCAN,
	COMMAND_REPLY_LENGTH_SINGLE_BYTE
} from './defs.js'
import { range } from './range.js'

function assertAtLeastByteLength(buffer, length) {
	if(buffer.byteLength < length) { throw new Error('invalid byte length - short') }
}

function assertNonZeroByteLength(buffer) {
	if(buffer.byteLength <= 0) { throw new Error('zero (or less 🤯) length buffer') }
}

function assertBytesRead(bytesRead, target) {
	if(bytesRead !== target) { throw new Error('invalid byte length') }
}

export class ResponseBufferParser {
	static _parseByte({ buffer, bytesRead }) {
		assertNonZeroByteLength(buffer)
		assertAtLeastByteLength(buffer, COMMAND_REPLY_LENGTH_SINGLE_BYTE)
		assertBytesRead(bytesRead, COMMAND_REPLY_LENGTH_SINGLE_BYTE)

		const u8 = ArrayBuffer.isView(buffer) ?
			new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new Uint8Array(buffer)

		return u8[0]
	}

	/**
	 * @param {Object} readResult
	 * @param {ArrayBuffer|ArrayBufferView} readResult.buffer
	 * @param {number} readResult.bytesRead
	 * @returns {Array<string>}
	 */
	static _parseString({ buffer, bytesRead }) {
		const decoder = new TextDecoder()
		const str = decoder.decode(buffer)
		return str.slice(1, -1).split(' ')
	}


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
	 * @param {ArrayBuffer|ArrayBufferView} readResult.buffer
	 * @param {number} readResult.bytesRead
	 */
	static parseTransmitStatusInfo({ bytesRead, buffer }) {
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
		] = ResponseBufferParser._parseString({ buffer, bytesRead })

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
	 * @param {ArrayBuffer|ArrayBufferView} readResult.buffer
	 * @param {number} readResult.bytesRead
	 */
	static parseEchoByte({ bytesRead, buffer }) {
		return ResponseBufferParser._parseByte({ bytesRead, buffer })
	}

		/**
	 * @param {Object} readResult
	 * @param {ArrayBuffer|ArrayBufferView} readResult.buffer
	 * @param {number} readResult.bytesRead
	 */
	static parseStart({ bytesRead, buffer }) {
		const b = ResponseBufferParser._parseByte({ bytesRead, buffer })

		const RESERVED_5_MASK = 0b00110
		const ARBITRATION_MASK = 0b100
		const TO_MASK = 0b010
		const ACK_MASK = 0b001

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
	 * @param {ArrayBuffer|ArrayBufferView} readResult.buffer
	 * @param {number} readResult.bytesRead
	 */
	static parseResetBus({ bytesRead, buffer }) {
		const b = ResponseBufferParser._parseByte({ bytesRead, buffer })

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
	 * @param {ArrayBuffer|ArrayBufferView} readResult.buffer
	 * @param {number} readResult.bytesRead
	 */
	static parseScan({ bytesRead, buffer }) {
		assertAtLeastByteLength(buffer, COMMAND_REPLY_LENGTH_SCAN)
		assertBytesRead(bytesRead, COMMAND_REPLY_LENGTH_SCAN)

		const u8 = ArrayBuffer.isView(buffer) ?
			new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new Uint8Array(buffer)

		const SCAN_START_ADDRESS = 0x08 // scan from 0x08 to 0x77
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
	 * @param {ArrayBuffer|ArrayBufferView} readResult.buffer
	 * @param {number} readResult.bytesRead
	 */
	static parseInternalStatus({ bytesRead, buffer }) {
		const parts = ResponseBufferParser._parseString({ buffer, bytesRead })

		// id ds sp SMB0CF SMB0CN T2 T3 IE EIE1 P0 P0MDIN P0MDOUT P1 P1MDIN P1MDOUT P2 P2MDOUT"

		const [
			id, ds, sp, smb0cf, smb0cn, t2, t3, ie, eie1,
			p0, p0mdin, p0mdout, p1, p1mdin, p1mdout, p2, p2mdout,
			convs
		] = parts.map(hex => parseInt(hex, 16))

		return {
			id, ds, sp, smb0cf, smb0cn, t2, t3, ie, eie1,
			p0, p0mdin, p0mdout, p1, p1mdin, p1mdout, p2, p2mdout,
			convs
		}
	}
}
