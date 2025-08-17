import { CoreExcameraLabsI2CDriver } from './serial.js'
import { ResponseBufferParser } from './parse-buffers.js'
import {
	COMMAND_BITBANG_CONTROL,
	COMMAND_BITBANG_END_COMMAND,
	COMMAND_BITBANG_ENTER_MODE,
	COMMAND_BITBANG_EXIT_MODE,
	COMMAND_CAPTURE_ENTER_MODE,
	COMMAND_ECHO_BYTE,
	COMMAND_MASK_READ_NACK_FINAL,
	COMMAND_MASK_WRITE,
	COMMAND_MONITOR_ENTER_MODE,
	COMMAND_MONITOR_EXIT_MODE,
	COMMAND_READ_ACK_ALL,
	COMMAND_READ_REGISTER,
	COMMAND_REBOOT,
	COMMAND_REPLY_LENGTH_INTERNAL_STATE,
	COMMAND_REPLY_LENGTH_SCAN,
	COMMAND_REPLY_LENGTH_SINGLE_BYTE,
	COMMAND_REPLY_LENGTH_TRANSMIT_STATUS_INFO,
	COMMAND_RESET_BUS,
	COMMAND_SCAN,
	COMMAND_SET_PULLUP_CONTROL,
	COMMAND_SET_SPEED_100,
	COMMAND_SET_SPEED_400,
	COMMAND_START,
	COMMAND_STOP,
	COMMAND_TRANSMIT_INTERNAL_STATE,
	COMMAND_TRANSMIT_STATUS_INFO
} from './defs.js'

/** @import { SerialPort, ReadResult, TargetReadBuffer, SendBuffer, CommandOptions } from './serial.js' */
/** @import { TransmitStatusInfo, Start, StartWithDevice, BusStatus } from './parse-buffers.js' */


export class ExcameraLabsI2CDriver {
	/**
	 * @param {SerialPort} port
	 * @param {CommandOptions} [options]
	 * @returns {Promise<TransmitStatusInfo>}
	 */
	static async transmitStatusInfo(port, options) {
		const readBuffer = new ArrayBuffer(COMMAND_REPLY_LENGTH_TRANSMIT_STATUS_INFO)
		return ResponseBufferParser.parseTransmitStatusInfo(await CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_TRANSMIT_STATUS_INFO, undefined, COMMAND_REPLY_LENGTH_TRANSMIT_STATUS_INFO, readBuffer, options))
	}

	/**
	 * @param {SerialPort} port
	 * @param {CommandOptions} [options]
	 * @returns {Promise<any>}
	 */
	static async internalState(port, options) {
		const readBuffer = new ArrayBuffer(COMMAND_REPLY_LENGTH_INTERNAL_STATE)
		return ResponseBufferParser.parseInternalStatus(await CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_TRANSMIT_INTERNAL_STATE, undefined, COMMAND_REPLY_LENGTH_INTERNAL_STATE, readBuffer, options))
	}

	/**
	 * @param {SerialPort} port
	 * @param {number} b
	 * @param {CommandOptions} [options]
	 * @returns {Promise<number>}
	 */
	static async echoByte(port, b, options) {
		const readBuffer = new ArrayBuffer(COMMAND_REPLY_LENGTH_SINGLE_BYTE)
		return ResponseBufferParser.parseEchoByte(await CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_ECHO_BYTE, Uint8Array.from([ b ]), COMMAND_REPLY_LENGTH_SINGLE_BYTE, readBuffer, options))
	}

	/**
	 * @param {SerialPort} port
	 * @param {number} speed
	 * @param {CommandOptions} [options]
	 * @returns {Promise<void>}
	 */
	static async setSpeed(port, speed, options) {
		if(![1, 100, 4, 400].includes(speed)) { throw new Error('invalid speed') }
		const speedCommand = (speed === 4 || speed === 400) ? COMMAND_SET_SPEED_400 : COMMAND_SET_SPEED_100
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, speedCommand, options)
	}

	/**
	 * @param {SerialPort} port
	 * @param {number} dev
	 * @param {boolean} readMode
	 * @param {CommandOptions} [options]
	 * @returns {Promise<Start>}
	 */
	static async start(port, dev, readMode, options) {
		const b = (dev << 1) | (readMode ? 1 : 0)
		const commandBuffer = Uint8Array.from([ b ])
		const readBuffer = commandBuffer.buffer // reuse
		return ResponseBufferParser.parseStart(await CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_START, commandBuffer, COMMAND_REPLY_LENGTH_SINGLE_BYTE, readBuffer, options))
	}

	/**
	 * @param {SerialPort} port
	 * @param {number} count
	 * @param {TargetReadBuffer} readBuffer
	 * @param {CommandOptions} [options]
	 * @returns {Promise<ReadResult>}
	 */
	static async readNACKFinal(port, count, readBuffer, options) {
		const count_mask = 0b0011_1111
		const countMinusOne = count - 1
		const valid = (countMinusOne & count_mask) === countMinusOne
		if(!valid) { throw new Error('invalid count') }

		const command = COMMAND_MASK_READ_NACK_FINAL | countMinusOne
		return CoreExcameraLabsI2CDriver.sendRecvCommand(port, command, undefined, count, readBuffer, options)
	}

	/**
	 * @param {SerialPort} port
	 * @param {number} count
	 * @param {SendBuffer} bufferSource
	 * @param {CommandOptions} [options]
	 * @returns {Promise<Start>}
	 */
	static async write(port, count, bufferSource, options) {
		const count_mask = 0b00111111
		const countMinusOne = count - 1
		const valid = (countMinusOne & count_mask) === countMinusOne
		if(!valid) { throw new Error('invalid count') }

		const command = COMMAND_MASK_WRITE | countMinusOne
		const readBuffer = new ArrayBuffer(COMMAND_REPLY_LENGTH_SINGLE_BYTE)
		return ResponseBufferParser.parseStart(await CoreExcameraLabsI2CDriver.sendRecvCommand(port, command, bufferSource, COMMAND_REPLY_LENGTH_SINGLE_BYTE, readBuffer, options))
	}

	/**
	 * @param {SerialPort} port
	 * @param {number} count
	 * @param {TargetReadBuffer} readBuffer
	 * @param {CommandOptions} [options]
	 * @returns {Promise<ReadResult>}
	 */
	static async readACKAll(port, count, readBuffer, options) {
		return CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_READ_ACK_ALL, Uint8Array.from([ count ]), count, readBuffer, options)
	}

	/**
	 * @param {SerialPort} port
	 * @param {CommandOptions} [options]
	 * @returns {Promise<void>}
	 */
	static async stop(port, options) {
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, COMMAND_STOP, options)
	}

	/**
	 * @param {SerialPort} port
	 * @param {CommandOptions} [options]
	 * @returns {Promise<BusStatus>}
	 */
	static async resetBus(port, options) {
		const readBuffer = new ArrayBuffer(COMMAND_REPLY_LENGTH_SINGLE_BYTE)
		return ResponseBufferParser.parseResetBus(await CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_RESET_BUS, undefined, COMMAND_REPLY_LENGTH_SINGLE_BYTE, readBuffer, options))
	}

	/**
	 * @param {SerialPort} port
	 * @param {number} dev
	 * @param {number} addr
	 * @param {number} count
	 * @param {TargetReadBuffer} readBuffer
	 * @param {CommandOptions} [options]
	 * @returns {Promise<ReadResult>}
	 */
	static async readRegister(port, dev, addr, count, readBuffer, options) {
		const data = Uint8Array.from([ dev, addr, count ])
		return CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_READ_REGISTER, data, count, readBuffer, options)
	}

	/**
	 * @param {SerialPort} port
	 * @param {CommandOptions} [options]
	 * @returns {Promise<StartWithDevice[]>}
	 */
	static async scan(port, options) {
		const readBuffer = new ArrayBuffer(COMMAND_REPLY_LENGTH_SCAN)
		return ResponseBufferParser.parseScan(await CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_SCAN, undefined, COMMAND_REPLY_LENGTH_SCAN, readBuffer, options))
	}

		/**
	 * @param {SerialPort} port
	 * @param {CommandOptions} [options]
	 * @returns {Promise<void>}
	 */
	static async enterMonitorMode(port, options) {
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, COMMAND_MONITOR_ENTER_MODE, options)
	}

	/**
	 * @param {SerialPort} port
	 * @param {CommandOptions} [options]
	 * @returns {Promise<void>}
	 */
		static async exitMonitorMode(port, options) {
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, COMMAND_MONITOR_EXIT_MODE, options)
	}

	/**
	 * @param {SerialPort} port
	 * @param {CommandOptions} [options]
	 * @returns {Promise<void>}
	 */
	static async enterCaptureMode(port, options) {
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, COMMAND_CAPTURE_ENTER_MODE, options)
	}

	/**
	 * @param {SerialPort} port
	 * @param {CommandOptions} [options]
	 * @returns {Promise<void>}
	 */
	static async enterBitbangMode(port, options) {
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, COMMAND_BITBANG_ENTER_MODE, options)
	}

	/**
	 * @param {SerialPort} port
	 * @param {number[]} commands
	 * @param {CommandOptions} [options]
	 * @returns {Promise<ReadResult>}
	 */
	static async sendBitbangCommand(port, commands, options) {
		const buffer = Uint8Array.from([ ...commands.map(command => {
			const controlSequence = command & 0b000_1_11_11
			return controlSequence
		}), 0x40 ])

		const recvLength = commands.filter(command => (command & 0b000_1_00_00) === 0b000_1_00_00).length

		const readBuffer = new ArrayBuffer(recvLength)

		return CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_BITBANG_CONTROL, buffer, recvLength, readBuffer, options)
	}

	/**
	 * @param {SerialPort} port
	 * @param {CommandOptions} [options]
	 * @returns {Promise<void>}
	 */
	static async endBitbangCommand(port, options) {
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, COMMAND_BITBANG_END_COMMAND, options)
	}

	/**
	 * @param {SerialPort} port
	 * @param {CommandOptions} [options]
	 * @returns {Promise<void>}
	 */
	static async exitBitbangMode(port, options) {
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, COMMAND_BITBANG_EXIT_MODE, options)
	}

	/**
	 * @param {SerialPort} port
	 * @param {CommandOptions} [options]
	 * @returns {Promise<void>}
	 */
	static async setPullupControls(port, sda, scl, options) {
		const b = (scl << 3) | sda
		return CoreExcameraLabsI2CDriver.sendCommandNoReply(port, COMMAND_SET_PULLUP_CONTROL, Uint8Array.from([ b ]), options)
	}

	/**
	 * @param {SerialPort} port
	 * @param {CommandOptions} [options]
	 * @returns {Promise<void>}
	 */
	static async reboot(port, options) {
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, COMMAND_REBOOT, options)
	}
}
