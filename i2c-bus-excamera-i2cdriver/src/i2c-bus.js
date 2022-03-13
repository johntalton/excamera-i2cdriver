
// import { I2CBus } from '@johntalton/and-other-delights'

async function readRegister(driver, addr, reg, length) {
	console.log('> start write', addr)
	const startOk = await driver.start(addr, false)
	console.log({ startOk })

	//
	console.log('> write register address')
	const writeAddrOk = await driver.write(1, Uint8Array.from([reg]))
	console.log({ writeAddrOk })

	//
	console.log('> start read')
	const startReadOk = await driver.start(addr, true)
	console.log({ startReadOk })

	const readOk = await driver.readNACKFinal(length)
	console.log({ readOk })

	//
	console.log('stop')
	await driver.stop()

}

async function writeRegister(driver, addr, reg, sourceBuffer) {
	console.log('* start write', acked.dev)
	const startOk = await driver.start(0x77, false)
	console.log({ startOk })

	console.log('* write address')
	const writeAddrOk = await driver.write(1, Uint8Array.from([0x1b]))
	console.log({ writeAddrOk })

	const writeOk = await driver.write(1, Uint8Array.from([0b0011_0011]))
	console.log({ writeOk })

	console.log('*stop')
	await driver.stop()
}

async function i2cRead(driver, address, length, readBuffer) {
	const startOk = await driver.start(address, true)
	if (startOk.ack !== 1) { throw new Error('no start ack') }

	const buffer = await driver.readNACKFinal(length)
	const bytesRead = buffer.byteLength

	await driver.stop()

	return {
		bytesRead, buffer: buffer.buffer
	}
}

async function i2cWrite(driver, address, length, sourceBuffer) {
	const startOk = await driver.start(address, false)
	if (startOk.ack !== 1) { throw new Error('no start ack') }

	console.log({ sourceBuffer })
	await driver.write(length, sourceBuffer)

	await driver.stop()

	return {
		bytesWritten: length,
		buffer: sourceBuffer.buffer
	}
}


export class I2CBusExacmeraI2CDriver {
	#driver

	static from(options) {
		const { I2CAPI } = options
		return new I2CBusExacmeraI2CDriver(I2CAPI)
	}

	constructor(driver) {
		this.#driver = driver
	}


	close() {}

	async sendByte(address, byteValue) {
		// is this equilvilant
		return i2cWrite(this.#driver, address, 1, Uint8Array.from([ byteValue ]))
	}

	async readI2CBlock(address, cmd, length, bufferSource) {
		// todo read back into bufferSource and return
		return readRegister(this.#driver, address, cmd, length)
	}

	async writeI2cBlock(address, cmd, length, bufferSource) {
		// todo ... create view / slice buffer source to length
		return writeRegister(this.#driver, address, cmd, bufferSource)
	}

	async i2cRead(address, length, bufferSource) {
		return i2cRead(this.#driver, address, length, bufferSource)
	}

	async i2cWrite(address, length, bufferSource) {
		return i2cWrite(this.#driver, address, length, bufferSource)
	}
}



