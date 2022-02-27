import {
	ExcameraLabsI2cDriver,
	EXCAMERA_LABS_VENDOR_ID,
	EXCAMERA_LABS_MINI_PRODUCT_ID
} from './excamera-labs-i2c-driver/i2c-driver.js'

import { CaptureEventParser } from './excamera-labs-i2c-driver/parse-event.js'

// import { SSD1306 } from './ssd1306/ssd1306.js'
import * as tcaModule from './node_modules/@johntalton/tca9548a/src/index.js'
const { Tca9548a } = tcaModule

import { I2CAddressedBus } from './node_modules/@johntalton/and-other-delights/lib/i2c-addressed.js'

function watchDevices() {
	navigator.serial.addEventListener('connect', (e) => {
        console.log('connect', e.target)
    })

    navigator.serial.addEventListener('disconnect', (e) => {
        console.log('disconnect', e.target)
    })
}

function deviceGuessByAddress(address) {
	const known = [
		{ addresses: [ 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1F ], name: 'mcp9808' },
		{ addresses: [ 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27 ], name: 'mcp23xxx' },
		{ addresses: [ 0x29 ], name: 'tcs34725' },
		{ addresses: [ 0x28, 0x29, 0x2a, 0x2b ], name: 'ds3502' },
		{ addresses: [ 0x76, 0x77 ], name: 'boschIEU' },
		{ addresses: [ 0x3d ], name: 'ssd1306' },
		{ addresses: [ 0x48, 0x49, 0x4a, 0x4b ], name: 'ads1115' },
		{ addresses: [ 0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, ], name: 'ina219' },
		{ addresses: [ 0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77 ], name: 'tca9548a' },
		{ addresses: [ 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57], name: 'mb85rc' },
		{ addresses: [ 0x62, 0x63 ], name: 'mcp4725a1'},
		{ addresses: [ 0x5c ], name: 'am2320' },
		{ addresses: [ 0x5c ], name: 'am2315' }

	]

	return known.filter(item => item.addresses.includes(address))
}


async function scanExistingOpenPorts(UIAddDevice) {
	const ports = await navigator.serial.getPorts()
	ports.forEach(port => {
		UIAddDevice(port)
	})
}

async function openExcameraLabsDevice(port) {
	// at 1M baud, 8 bits, no parity, 1 stop bit (1000000 8N1).
	await port.open({
		baudRate: 1000000,
		dataBits: 8,
		parity: 'none',
		stopBits: 1
	})
}

async function requestExcameraLabDevice() {
	return navigator.serial.requestPort({
		filters: [ { usbVendorId: EXCAMERA_LABS_VENDOR_ID } ]
	})
}

async function onContentLoaded() {
	const requestDevButton = document.getElementById('requestDevice')
	const deviceListList = document.getElementById('deviceList')

	function UIAddDevice(port) {
		console.log('UI: AddDevice', port)
		const li = document.createElement('li')
		// li.setAttribute('data-port', port)
		deviceListList.appendChild(li)

		const result = port.getInfo()
		console.log({ result })
		li.textContent = 'Excamera Labs I²C Driver'

		const openButton = document.createElement('button')
		openButton.textContent = '🔌'
		li.appendChild(openButton)

		const closeButton = document.createElement('button')
		closeButton.textContent = '❌'
		closeButton.disabled = true
		li.appendChild(closeButton)

		const scanButton = document.createElement('button')
		scanButton.textContent = '📡'
		scanButton.disabled = true
		li.appendChild(scanButton)

		const monitorButton = document.createElement('button')
		monitorButton.textContent = '👂'
		monitorButton.disabled = true
		li.appendChild(monitorButton)

		const rebootButton = document.createElement('button')
		rebootButton.textContent = '😵'
		rebootButton.disabled = true
		li.appendChild(rebootButton)


		openButton.addEventListener('click', e => {
			openButton.disabled = true
			
			openExcameraLabsDevice(port)
				.then(() => {
					closeButton.disabled = false
					scanButton.disabled = false
					monitorButton.disabled = false
					rebootButton.disabled = false
				})
				// .then(async () => ExcameraLabsI2cDriver.reboot(port))
				.then(async () => {
					console.log('running i2cdriver init script')
					// exit and return to i2x mode if not in it already
					await ExcameraLabsI2cDriver.endBitbangCommand(port)

					// end more (64) bytes of @ to flush the connection
					// ?

					// echo some bytes to validate the connection
					const echoSig = [0x55, 0x00, 0xff, 0xaa]
					for (let echoByte of echoSig) {
						await ExcameraLabsI2cDriver.echoByte(port, echoByte)
					}
				})
				.then(() => ExcameraLabsI2cDriver.transmitStatusInfo(port))
				.then(info => {
					console.log(info)
					const {
						identifier, mode, serial, uptime
					} = info

					const identStr = identifier === 'i2cdriverm' ? 'Mini' : 'Other'

					const modeStr = mode === 'I' ? 'I²C Mode' : 'Bitbang Mode'
					const uptimeStr = 'up ' + parseInt(uptime) + ' seconds'

					const infoDiv = document.createElement('div')
					infoDiv.textContent = `${identStr} / ${serial} / ${modeStr} / ${uptimeStr}`

					li.appendChild(infoDiv)
				})
				.catch(console.warn)
		})

		closeButton.addEventListener('click', e => {
			closeButton.disabled = true
			scanButton.disabled = true
			monitorButton.disabled = true

			const oldUlElem = li.querySelector('ul')
			if(oldUlElem !== null) { oldUlElem.remove() }

			port.close()
				.then(() => {
					openButton.disabled = false
				})
				.catch(console.warn)
		})

		scanButton.addEventListener('click', async e => {
			const oldUlElem = li.querySelector('ul')
			if(oldUlElem !== null) { oldUlElem.remove() }

			const driver = ExcameraLabsI2cDriver.from({ port })

			ExcameraLabsI2cDriver.scan(port)
				.then(results => results.filter(result => result.ack === 1))
				.then(async ackeds => {
					const ulElem = document.createElement('ul')

					ackeds.forEach(acked => {
						const devLi = document.createElement('li')
						devLi.textContent = 'Addr 0x' + acked.dev.toString(16)

						const deviceGuesses = deviceGuessByAddress(acked.dev)
						
						if(deviceGuesses.length > 0) {

							const guessSelect = document.createElement('select')
							guessSelect.disabled = deviceGuesses.length === 1

							const options = deviceGuesses.map(guess => {
								const option = document.createElement('option')
								option.appendChild(document.createTextNode(guess.name))
								option.value = guess.name

								return option
							})

							options.forEach(options => guessSelect.appendChild(options))

							devLi.appendChild(guessSelect)

							const makeSensor = document.createElement('button')
							makeSensor.textContent = '🌡'
							devLi.appendChild(makeSensor)

							makeSensor.addEventListener('click', async e => {
								const { altKey, metaKey, shiftKey } = e

								const selectedOptions = guessSelect.selectedOptions[0]
								const name = selectedOptions.value

								
								console.log('make sensor', '0x' + acked.dev.toString(16), name, { altKey, metaKey, shiftKey })

								await driver.setSpeed(400)

								// const reg = await ExcameraLabsI2cDriver.readRegister(port, 0x77, 0x1b, 1)
								// console.log({ reg })
	
								async function readRegister(addr, reg, length) {
									console.log('> start write', addr)
									const startOk = await driver.start(addr, false)
									console.log({ startOk })

									//
									console.log('> write register address')
									const writeAddrOk = await driver.write(1, Uint8Array.from([ reg ]))
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
									const writeAddrOk = await driver.write(1, Uint8Array.from([ 0x1b ]))
									console.log({ writeAddrOk })

									const writeOk = await driver.write(1, Uint8Array.from([ 0b0011_0011 ]))
									console.log({ writeOk })

									console.log('*stop')
									await driver.stop()
								}

								async function i2cRead(address, length, readBuffer) {
									const startOk = await driver.start(address, true)
									if(startOk.ack !== 1) { throw new Error('no start ack') }

									const buffer = await driver.readNACKFinal(length)
									const bytesRead = buffer.byteLength

									await driver.stop()

									return {
										bytesRead, buffer: buffer.buffer
									}
								}

								async function i2cWrite(address, length, sourceBuffer) {
									const startOk = await driver.start(address, false)
									if(startOk.ack !== 1) { throw new Error('no start ack') }

									console.log({ sourceBuffer })
									await driver.write(length, sourceBuffer)

									await driver.stop()

									return {
										bytesWritten: length,
										buffer: sourceBuffer.buffer
									}
								}


								const bus = {
									i2cRead, i2cWrite
								}

								const abus = I2CAddressedBus.from(bus, acked.dev, { allocOnRead: true })

								const tca9548a = await Tca9548a.from(abus, { })
								console.log('getChannels')
								const channels = await tca9548a.getChannels()
								
								
								const tca9548aChannelsElem = document.getElementById('tca9548a_channels')
								const chElems = {
									ch0: document.getElementById('ch0'),
									ch1: document.getElementById('ch1'),
									ch2: document.getElementById('ch2'),
									ch3: document.getElementById('ch3'),
									ch4: document.getElementById('ch4'),
									ch5: document.getElementById('ch5'),
									ch6: document.getElementById('ch6'),
									ch7: document.getElementById('ch7'),
								}

								tca9548aChannelsElem.addEventListener('change', async e => {
									const { target } = e
									console.log('channel requiest change')

									tca9548aChannelsElem.disable = true


									// [ 1, 4, 7]
									const channelsToSet = [
										chElems.ch0.checked === true ? 0 : undefined,
										chElems.ch1.checked === true ? 1 : undefined,
										chElems.ch2.checked === true ? 2 : undefined,
										chElems.ch3.checked === true ? 3 : undefined,
										chElems.ch4.checked === true ? 4 : undefined,
										chElems.ch5.checked === true ? 5 : undefined,
										chElems.ch6.checked === true ? 6 : undefined,
										chElems.ch7.checked === true ? 7 : undefined
									]
									.filter(ch => ch !== undefined)

									await tca9548a.setChannels(channelsToSet)
									const resultChannels = await tca9548a.getChannels()

									const allCh = [ 0, 1, 2, 3, 4, 5, 6, 7 ]
									allCh.forEach(ch => {
										const on = resultChannels.includes(ch)
									// 	console.log('set checkbox for channel', ch, on)
									})


									tca9548aChannelsElem.disable = false
								})

								//	await writeRegister()
								// await readRegister()

								// const reg2 = await ExcameraLabsI2cDriver.readRegister(port, 0x77, 0x00, 1)
								// console.log({ reg2 })

								// const reg3 = await ExcameraLabsI2cDriver.readRegister(port, 0x77, 0x1b, 1)
								// console.log({ reg3 })
								
			
								// const i2cbus = {
								// 	driver
								// }

								// const addressedDev = { dev: acked.dev, i2cbus }								

						

							}, { once: true })
						}

						ulElem.appendChild(devLi)
					})

					li.appendChild(ulElem)
				})
				.catch(console.warn)
		})

		monitorButton.addEventListener('click', async () => {

			// console.log('enter monitor')
			// await ExcameraLabsI2cDriver.enterMonitorMode(port)

			console.log('enter capture')
			await ExcameraLabsI2cDriver.enterCaptureMode(port)

			const defaultReader = port.readable.getReader()
			

			function* range(start, end) {
				yield start
				if (start === end) return
				yield* range(start + 1, end)
			}

			async function *reader(dReader) {
				while(true) {
					const { value, done } = await dReader.read()
					if(done) { return }
					yield value.buffer
				}
			}

			async function* byteStream(sbStream) {
				for await (const sourceBuffer of sbStream) {
					const dv = ArrayBuffer.isView(sourceBuffer) ?
						new DataView(sourceBuffer.buffer, sourceBuffer.byteOffset, sourceBuffer.byteLength) :
						new DataView(sourceBuffer)

					for (const idx of range(0, dv.byteLength - 1)) {
						yield dv.getUint8(idx)
					}
				}
			}

			async function* eventByteStream(bStream) {	
				for await(const b of bStream) {
					yield (b >> 4 & 0xf)
					yield (b & 0xf)
				}
			}

			async function* eventStream(ebStream) {
				for await(const eb of ebStream) {
					yield CaptureEventParser.parseEventByte(eb)
				}
			}

			async function* eventStateMachineStream(eStream, options) {
				for await(const e of eStream) {
					if(e === 'idle') { continue }

					yield e
				}
			}

			const pipeline = eventStream(eventByteStream(byteStream(reader(defaultReader))))
			const logical = eventStateMachineStream(pipeline, {})
			for await (const event of logical) {
				console.log({ event })
			}


			console.log('cancel')
			defaultReader.cancel()

		})
	}

	scanExistingOpenPorts(UIAddDevice)
		.catch(console.warn)

	requestDevButton.addEventListener('click', e => {
		requestExcameraLabDevice().then(port => {
			//
			console.log('user added port', port)
			UIAddDevice(port)
		})
		.catch(e => console.log('issues requesting device', e.message))
	}, { once: false })
	requestDevButton.disabled = false
}


onContentLoaded()
	.catch(console.warn)
