import { INITIAL_CRC } from './crc-16-ccitt.js'
import { ExcameraLabsI2CDriver } from './i2c-driver.js'

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

	async start(dev, readMode) {
		return ExcameraLabsI2CDriver.start(this.#port, dev, readMode)
			// .then(buffer => {
			// 	this.#crc = crcUpdate(this.#crc, Uint8Array.from([ dev ]), 1)
			// 	return buffer
			// })
	}

	async stop() { return ExcameraLabsI2CDriver.stop(this.#port) }

	async readACKAll(count, readBuffer) {
		return ExcameraLabsI2CDriver.readACKAll(this.#port, count, readBuffer)
			// .then(buffer => {
			// 	this.#crc = crcUpdate(this.#crc, buffer, count)
			// 	return buffer
			// })
	}

	async readNACKFinal(count, readBuffer) {
		return ExcameraLabsI2CDriver.readNACKFinal(this.#port, count, readBuffer)
			// .then(buffer => {
			// 	this.#crc = crcUpdate(this.#crc, buffer, count)
			// 	return buffer
			// })
	}

	async write(count, bufferSource) {
		return ExcameraLabsI2CDriver.write(this.#port, count, bufferSource)
			// .then(state => {
			// 	this.#crc = crcUpdate(this.#crc, bufferSource, count)
			// 	return state
			// })
	}

	async readRegister(dev, addr, count, readBuffer) {
		return ExcameraLabsI2CDriver.readRegister(this.#port, dev, addr, count, readBuffer)
			// .then(value => {
			// 	const buffer = Uint8Array.from([ value ])
			// 	this.#crc = crcUpdate(this.#crc, buffer, count)
			// 	return value
			// })
	}

	async resetBus() { return ExcameraLabsI2CDriver.resetBus(this.#port) }
	async transmitStatusInfo() { return ExcameraLabsI2CDriver.transmitStatusInfo(this.#port) }
}

