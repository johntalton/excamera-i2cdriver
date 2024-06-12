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

export class ExcameraLabsI2CDriver {
	static async transmitStatusInfo(port) {
		const readBuffer = new ArrayBuffer(COMMAND_REPLY_LENGTH_TRANSMIT_STATUS_INFO)
		return ResponseBufferParser.parseTransmitStatusInfo(await CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_TRANSMIT_STATUS_INFO, undefined, COMMAND_REPLY_LENGTH_TRANSMIT_STATUS_INFO, readBuffer))
	}

	static async internalState(port) {
		const readBuffer = new ArrayBuffer(COMMAND_REPLY_LENGTH_INTERNAL_STATE)
		return ResponseBufferParser.parseInternalStatus(await CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_TRANSMIT_INTERNAL_STATE, undefined, COMMAND_REPLY_LENGTH_INTERNAL_STATE, readBuffer))
	}

	static async echoByte(port, b) {
		const readBuffer = new ArrayBuffer(COMMAND_REPLY_LENGTH_SINGLE_BYTE)
		return ResponseBufferParser.parseEchoByte(await CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_ECHO_BYTE, Uint8Array.from([ b ]), COMMAND_REPLY_LENGTH_SINGLE_BYTE, readBuffer))
	}

	static async setSpeed(port, speed) {
		if(![1, 100, 4, 400].includes(speed)) { throw new Error('invalid speed') }
		const speedCommand = (speed === 4 || speed === 400) ? COMMAND_SET_SPEED_400 : COMMAND_SET_SPEED_100
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, speedCommand)
	}

	static async start(port, dev, readMode) {
		const b = (dev << 1) | (readMode ? 1 : 0)
		const commandBuffer = Uint8Array.from([ b ])
		const readBuffer = commandBuffer.buffer // reuse
		return ResponseBufferParser.parseStart(await CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_START, commandBuffer, COMMAND_REPLY_LENGTH_SINGLE_BYTE, readBuffer))
	}

	static async readNACKFinal(port, count, readBuffer) {
		const count_mask = 0b0011_1111
		const countMinusOne = count - 1
		const valid = (countMinusOne & count_mask) === countMinusOne
		if(!valid) { throw new Error('invalid count') }

		const command = COMMAND_MASK_READ_NACK_FINAL | countMinusOne
		return CoreExcameraLabsI2CDriver.sendRecvCommand(port, command, undefined, count, readBuffer)
	}

	static async write(port, count, bufferSource) {
		const count_mask = 0b00111111
		const countMinusOne = count - 1
		const valid = (countMinusOne & count_mask) === countMinusOne
		if(!valid) { throw new Error('invalid count') }

		const command = COMMAND_MASK_WRITE | countMinusOne
		const readBuffer = new ArrayBuffer(COMMAND_REPLY_LENGTH_SINGLE_BYTE)
		return ResponseBufferParser.parseStart(await CoreExcameraLabsI2CDriver.sendRecvCommand(port, command, bufferSource, COMMAND_REPLY_LENGTH_SINGLE_BYTE, readBuffer))
	}

	static async readACKAll(port, count, readBuffer) {
		return CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_READ_ACK_ALL, Uint8Array.from([ count ]), count, readBuffer)
	}

	static async stop(port) {
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, COMMAND_STOP)
	}

	static async resetBus(port) {
		const readBuffer = new ArrayBuffer(COMMAND_REPLY_LENGTH_SINGLE_BYTE)
		return ResponseBufferParser.parseResetBus(await CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_RESET_BUS, undefined, COMMAND_REPLY_LENGTH_SINGLE_BYTE, readBuffer))
	}

	static async readRegister(port, dev, addr, count, readBuffer) {
		const data = Uint8Array.from([ dev, addr, count ])
		return CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_READ_REGISTER, data, count, readBuffer)
	}

	static async scan(port) {
		const readBuffer = new ArrayBuffer(COMMAND_REPLY_LENGTH_SCAN)
		return ResponseBufferParser.parseScan(await CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_SCAN, undefined, COMMAND_REPLY_LENGTH_SCAN, readBuffer))
	}

	static async enterMonitorMode(port) {
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, COMMAND_MONITOR_ENTER_MODE)
	}

	static async exitMonitorMode(port) {
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, COMMAND_MONITOR_EXIT_MODE)
	}

	static async enterCaptureMode(port) {
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, COMMAND_CAPTURE_ENTER_MODE)
	}

	static async enterBitbangMode(port) {
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, COMMAND_BITBANG_ENTER_MODE)
	}

	static async sendBitbangCommand(port, commands) {
		const buffer = Uint8Array.from([ ...commands.map(command => {
			const controlSequence = command & 0b000_1_11_11
			return controlSequence
		}), 0x40 ])

		const recvLength = commands.filter(command => (command & 0b000_1_00_00) === 0b000_1_00_00).length

		const readBuffer = new ArrayBuffer(recvLength)

		return CoreExcameraLabsI2CDriver.sendRecvCommand(port, COMMAND_BITBANG_CONTROL, buffer, recvLength, readBuffer)
	}

	static async endBitbangCommand(port) {
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, COMMAND_BITBANG_END_COMMAND)
	}

	static async exitBitbangMode(port) {
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, COMMAND_BITBANG_EXIT_MODE)
	}

	static async setPullupControls(port, sda, scl) {
		const b = (scl << 3) | sda
		return CoreExcameraLabsI2CDriver.sendCommandNoReply(port, COMMAND_SET_PULLUP_CONTROL, Uint8Array.from([ b ]))
	}

	static async reboot(port) {
		return CoreExcameraLabsI2CDriver.sendCommandOnly(port, COMMAND_REBOOT)
	}
}
