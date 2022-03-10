
import {
	ExcameraLabsI2CDriver,
	EXCAMERA_LABS_VENDOR_ID,
	EXCAMERA_LABS_MINI_PRODUCT_ID
} from '../../src/i2c-driver.js'

import { eventStreamFromReader } from '../../src/capture-generator/index.js'

// import { deviceGuessByAddress } from './devices-i2c/guesses.js'

export const EXCAMERA_LABS_USB_FILTER = { usbVendorId: EXCAMERA_LABS_VENDOR_ID }

async function initScript(port) {
	console.log('running i2cdriver init script')

	// exit and return to i2x mode if not in it already
	await ExcameraLabsI2CDriver.endBitbangCommand(port)

	// end more (64) bytes of @ to flush the connection
	// ?

	// echo some bytes to validate the connection
	const echoSig = [0x55, 0x00, 0xff, 0xaa]
	for (let echoByte of echoSig) {
		await ExcameraLabsI2CDriver.echoByte(port, echoByte)
	}
}


export class ExcameraI2CDriverUIBuilder {
	static async builder(port) {
		return new ExcameraI2CDriverUIBuilder(port)
	}

	constructor(port) {
		this.port = port
		// console.log('make driver over port', port)
		// this.driver = ExcameraLabsI2CDriver.from({ port })
	}

	get title() {
		return 'Excamera Labs I²CDriver'
	}

	async open() {
		console.log('opening excamera labs port')
		// at 1M baud, 8 bits, no parity, 1 stop bit (1000000 8N1).
		await this.port.open({
			baudRate: 1000000,
			dataBits: 8,
			parity: 'none',
			stopBits: 1
		})

		// device author provided init script
		await initScript(this.port)

		console.log('check status info')
		const info = await ExcameraLabsI2CDriver.transmitStatusInfo(this.port)
		console.log(info)
	}

	async close() {
		return this.port.close()
	}

	async buildCustomView(sectionElem) {
		function appendChildSlot(root, name, elem) {
			elem.setAttribute('slot', name)
			root.appendChild(elem)
		}

		const root = document.createElement('excamera-i2cdriver')
		const addressElem = document.createElement('addr-display')
		addressElem.setAttribute('slot', 'scan-display')

		const scanButton = document.createElement('button')
		scanButton.setAttribute('slot', 'scan-display')
		scanButton.textContent = 'Scan'

		const rebootElem = document.createElement('button')
		rebootElem.textContent = 'Reboot'

		const resetElem = document.createElement('button')
		resetElem.textContent = 'Reset Bus'

		const captureStartElem = document.createElement('button')
		const captureEndElem = document.createElement('button')

		captureStartElem.textContent = 'Start Capture ▶️'
		captureEndElem.textContent = 'Stop Capture ⏸'

		appendChildSlot(root, 'capture-controls', captureStartElem)
		appendChildSlot(root, 'capture-controls', captureEndElem)

		captureStartElem.addEventListener('click', e => {
			console.log('start capture')
			captureStartElem.disabled = true
			scanButton.disabled = true

			Promise.resolve()
				.then(async () => {
					const controller = new AbortController()
					const { signal } = controller

					console.log('entering cpature mode')
					// await ExcameraLabsI2CDriver.enterMonitorMode(this.port)
					await ExcameraLabsI2CDriver.enterCaptureMode(this.port)

					const defaultReader = this.port.readable.getReader()
					const pipeline = eventStreamFromReader(defaultReader, { signal })

					captureEndElem.disabled = false

					captureEndElem.addEventListener('click', e => {
						controller.abort('user requested stop')
						defaultReader.cancel('user request stop')
						defaultReader.releaseLock()
					}, { once: true })



					console.log('strting reader loop')
					for await (const event of pipeline) {
						if(event.state === 'IDLE' || event.state === 'WARM') { continue }

						console.log(event)

					}

					const last = await await pipeline.next()
					console.log('this is the aftermath of the stream', last)
				})
				.catch(console.warn)
		}, { once: true })

		scanButton.addEventListener('click', e => {
			scanButton.disabled = true

			ExcameraLabsI2CDriver.scan(this.port)
				.then(results => {
					const olds = addressElem.querySelectorAll('hex-display')
					olds?.forEach(old => old.remove())

					results.map(result => {
						const {
							dev: addr,
							ack: acked,
							to: timedout,
							arb: arbitration
						} = result

						const hexElem = document.createElement('hex-display')

						hexElem.setAttribute('slot', addr)

						hexElem.toggleAttribute('acked', acked)
						hexElem.toggleAttribute('arbitration', arbitration)
						hexElem.toggleAttribute('timedout', timedout)

						hexElem.textContent = addr.toString(16).padStart(2, '0')

						return hexElem
					})
					.forEach(hexDisplay => {
						addressElem.appendChild(hexDisplay)
					})

					scanButton.disabled = false
				})
				.catch(console.warn)
		}, { once: false })

		root.appendChild(addressElem)
		root.appendChild(scanButton)
		return root
	}
}


/*


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


	*/