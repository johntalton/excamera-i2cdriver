
import {
	ExcameraLabsI2cDriver,
	EXCAMERA_LABS_VENDOR_ID,
	EXCAMERA_LABS_MINI_PRODUCT_ID
} from '../../src/i2c-driver.js'

// import { deviceGuessByAddress } from './devices-i2c/guesses.js'

export const EXCAMERA_LABS_USB_FILTER = { usbVendorId: EXCAMERA_LABS_VENDOR_ID }

export class ExcameraI2CDriver {
	static async from(port, options) {
		// at 1M baud, 8 bits, no parity, 1 stop bit (1000000 8N1).
		await port.open({
			baudRate: 1000000,
			dataBits: 8,
			parity: 'none',
			stopBits: 1
		})
	}
}


/*

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

								//









							})							
						}

						ulElem.appendChild(devLi)
					})

					li.appendChild(ulElem)
				})
				.catch(console.warn)
		})

		monitorButton.addEventListener('click', async () => {

			

			async function* reader(dReader) {
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

			async function* captureEventByteStream(bStream) {	
				for await(const b of bStream) {
					yield (b >> 4 & 0xf)
					yield (b & 0xf)
				}
			}

			async function* captureEventStream(cebStream) {
				for await(const eb of cebStream) {
					yield CaptureEventParser.parseEventByte(eb)
				}
			}




			function e2s (e) { 
				if(['start', 'stop', 'idle'].includes(e)) { return e }
				if([
					'000', '001', '010', '011',
					'100', '101', '110', '111'
				].includes(e)) { return 'data' }
			}

			const decodeStart = (first, second, third) => {
				const address = ((first & 0b111) << 4) |  ((second & 0b111) << 1) | ((third >> 2) & 0x1)
				const read = (third >> 1) & 0b1 === 1
				const acked = third & 0b1 === 1

				return { start: true, address, read, acked }
			}

			function decodeByte(first, second, third) {
				const b = ((first & 0b111) << 5) | ((second & 0b111) << 2) | ((third >> 1) & 0b11)
				const acked = third & 0b1 === 1
		
				return {
						value: b, acked
				}
			}

			const delayMs = ms => new Promise((resolve, ) => setTimeout(() => resolve(), ms))

			const STATES = {
				'IDLE': {
					'idle': { target: 'IDLE' },
					'start': { target: 'START' }
				},
				'START': {
					'data': { target: 'ADDRESS_1', sink: true }
				},
				'ADDRESS_1': {
					'data': { target: 'ADDRESS_2', sink: true }
				},
				'ADDRESS_2': {
					'data': { target: 'ADDRESSED', sink: true, emitAddress: true }
				},
				'ADDRESSED': {
					'data': { target: 'NOOP', sink: true }
				},


				'NOOP': {
					'start': { target: 'NOOP' },
					'stop': { target: 'NOOP' },
					'data': { target: 'NOOP' },
					'idle': { target: 'NOOP' }
				}
			}

			async function* annotatedEventStream(eStream) {
				for await (const event of eStream) {
					const { name } = event
					const state = e2s(name)
					yield {
						...event,
						state
					}
				}
			}

			async function* machineStates(eStream, options) {
				for await(const aEvent of annotatedEventStream(eStream, options)) {
					const { state, value } = aEvent

					const action = STATES[options.state][state]
					if(action === undefined) { throw new Error('unknown transition: ' + state) }
					
					//
					if(action.sink) {
						options.sink = options.sink ?? []
						options.sink = [ ...options.sink, value ]
					}

					if(options.sink?.length >= 3) {
						const data = decodeByte(...options.sink)
						
						options.sink = []

						if(data.acked !== true) {
							console.warn('nack data byte, error?')
						}

						yield data
					}
					
					//
					if(options.state !== action.target) {
						console.log('state transition from ' + options.state + ' to ' + action.target)
					}
					options.state = action.target
					
					//
					if(action.emitAddress) {
						const start = decodeStart(...options.sink)

						options.address = start.address
						options.read = start.read
						options.sink = []

						if(start.acked !== true) {
							console.warn('nack start address, error?')
						}

						yield start
					}

					if(state === 'stop') { yield aEvent }
					if(state === 'idle') { yield aEvent }
				}
			}



			// 
			console.log('enter capture')
			await ExcameraLabsI2cDriver.enterCaptureMode(port)

			const [ captureReader, logicalReader ] = port.readable.tee()
			const defaultLogicalReader = logicalReader.getReader()
			const defaultCaptureReader = captureReader.getReader()

			//const defaultLogicalReader = port.readable.getReader()

			try {
				const bytePipeline = byteStream(reader(defaultLogicalReader))
				const capturePipeline = captureEventStream(captureEventByteStream(bytePipeline))
				const logical = machineStates(capturePipeline, { state: 'IDLE' })

				for await (const event of logical) {
					if(event.name === 'idle') { continue }
					console.log(event)
				}

			} catch(e) {
				console.warn(e)
			} finally {
				console.log('cancel')
				await defaultLogicalReader.cancel()
				await defaultCaptureReader.cancel()
			}
		})
	}



	*/