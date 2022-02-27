





async function readRegister(addr, reg, length) {
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

async function writeRegister(addr, reg, sourceBuffer) {
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






async function i2cRead(address, length, readBuffer) {
	const startOk = await driver.start(address, true)
	if (startOk.ack !== 1) { throw new Error('no start ack') }

	const buffer = await driver.readNACKFinal(length)
	const bytesRead = buffer.byteLength

	await driver.stop()

	return {
		bytesRead, buffer: buffer.buffer
	}
}

async function i2cWrite(address, length, sourceBuffer) {
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

