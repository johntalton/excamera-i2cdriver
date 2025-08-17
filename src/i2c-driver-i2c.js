import { INITIAL_CRC } from './crc-16-ccitt.js'
import { ExcameraLabsI2CDriver } from './i2c-driver.js'

/** @import { I2CAddress, I2CBufferSource, I2CReadResult } from '@johntalton/and-other-delights' */
/** @import { SerialPort } from './serial.js' */
/** @import { Start } from './parse-buffers.js' */

export class ExcameraLabsI2CDriverI2C {
	#port
	#crc = INITIAL_CRC

	static from(options) { return new ExcameraLabsI2CDriverI2C(options) }

	/**
	 * @param {SerialPort} port
	 */
	constructor({ port }) { this.#port = port }

	get crc() { return this.#crc }
	set crc(crc) { this.#crc = crc }

	/**
	 * @param {I2CAddress} dev
	 * @param {boolean} readMode
	 * @returns {Promise<Start>}
	 */
	async start(dev, readMode) {
		return ExcameraLabsI2CDriver.start(this.#port, dev, readMode)
			// .then(buffer => {
			// 	this.#crc = crcUpdate(this.#crc, Uint8Array.from([ dev ]), 1)
			// 	return buffer
			// })
	}

	async stop() { return ExcameraLabsI2CDriver.stop(this.#port) }

	/**
	 * @param {number} count
	 * @param {I2CBufferSource} readBuffer
	 * @returns {Promise<I2CReadResult>}
	 */
	async readACKAll(count, readBuffer) {
		return ExcameraLabsI2CDriver.readACKAll(this.#port, count, readBuffer)
			// .then(result => {
			//	const { buffer, bytesRead } = result
			// 	this.#crc = crcUpdate(this.#crc, buffer, count)
			// 	return result
			// })
	}

	/**
	 * @param {number} count
	 * @param {I2CBufferSource} readBuffer
	 * @returns {Promise<I2CReadResult>}
	 */
	async readNACKFinal(count, readBuffer) {
		return ExcameraLabsI2CDriver.readNACKFinal(this.#port, count, readBuffer)
			// .then(result => {
			//	const { buffer, bytesRead } = result
			// 	this.#crc = crcUpdate(this.#crc, buffer, count)
			// 	return result
			// })
	}

	/**
	 * @param {number} count
	 * @param {I2CBufferSource} bufferSource
	 * @returns {Promise<Start>}
	 */
	async write(count, bufferSource) {
		return ExcameraLabsI2CDriver.write(this.#port, count, bufferSource)
			// .then(state => {
			// 	this.#crc = crcUpdate(this.#crc, bufferSource, count)
			// 	return state
			// })
	}

	/**
	 * @param {I2CAddress} dev
	 * @param {number} addr
	 * @param {number} count
	 * @param {I2CBufferSource} readBuffer
	 * @returns {Promise<I2CReadResult>}
	 */
	async readRegister(dev, addr, count, readBuffer) {
		return ExcameraLabsI2CDriver.readRegister(this.#port, dev, addr, count, readBuffer)
			// .then(result => {
			//	const { buffer, bytesRead } = result
			// 	this.#crc = crcUpdate(this.#crc, buffer, count)
			// 	return result
			// })
	}

	async resetBus() { return ExcameraLabsI2CDriver.resetBus(this.#port) }
	async transmitStatusInfo() { return ExcameraLabsI2CDriver.transmitStatusInfo(this.#port) }
	async scan() { return ExcameraLabsI2CDriver.scan(this.#port) }
}

