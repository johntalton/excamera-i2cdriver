import { MCP2221A } from '@johntalton/mcp2221'
import { dumpHIDDevice } from '../util/hid-info.js'

async function onceInputReport(hid, timeoutMs) {
	return new Promise((resolve, reject) => {
		const tout = setTimeout(() => reject(new Error('HID input report timedout')), timeoutMs)
		hid.addEventListener('inputreport', e => {
			clearTimeout(tout)
			resolve(e)
		}, { once: true })
	})
}

export class MCP2221UIBuilder {
	#hidDevice
	#device

	static async builder(hidDevice, ui) {
		return new MCP2221UIBuilder(hidDevice)
	}

	constructor(hidDevice) {
		this.#hidDevice = hidDevice
	}

	get title() { return this.#hidDevice.productName }

	async open() {
		await this.#hidDevice.open()

		dumpHIDDevice(this.#hidDevice)

		const binding = {
			read: async length => {
				// console.log('usbRead', length)

				// this is a risky approuch as the binding to the
				// single trigger event may be added after the
				// actaully importreport event has been triggered
				// this should be more coupled with the write command
				// and, like other usb wappers, expos a transfer function
				const { returnValue, reportId, data, device } = await onceInputReport(this.#hidDevice, 5000)
				if(reportId !== 0) { throw new Error('always reprot zero') }
				if(!returnValue) { throw new Error('no return value') }
				return data.buffer
			},
			write: async sourceBuffer => {
				// console.log('usbWrite', sourceBuffer)
				await this.#hidDevice.sendReport(0, sourceBuffer)
				return sourceBuffer.bytesLength
			}
		}

		this.#device = await MCP2221A.from(binding)
		//await this.#device.common.reset()
		// await this.#device.sram.set()
		const status = await this.#device.common.status({ cancelI2c: true })
		console.log({ status })

		const sramGet = await this.#device.sram.get()
		console.log({ sramGet })

		 //	const flashGet = await this.#device.flash.get()


	}

	async close() {
		return this.#hidDevice.close()
	}

	signature() {
		return `USB(${this.#hidDevice.vendorId},${this.#hidDevice.productId})`
	}

	async buildCustomView() {
		const root = document.createElement('mcp2221-config')

		const resetI2CButton = document.createElement('button')
		resetI2CButton.textContent = 'reset 📡'
		resetI2CButton.setAttribute('slot', 'i2c-controls')
		root.appendChild(resetI2CButton)

		// <button>scan </button>
		const scanButton = document.createElement('button')
		scanButton.textContent = 'scan 📡'
		scanButton.setAttribute('slot', 'i2c-controls')
		root.appendChild(scanButton)

		scanButton.addEventListener('click', e => {
			scanButton.disabled = true

			console.log('mcp2221 testing ...')

			Promise.resolve()
				.then(async () => {


					const result = await this.#device.sram.set({
					// 	// clock: {
					// 	// 	dutyCycle: '25%',
					// 	// 	divider: '3 MHz'
					// 	// },

					// 	gpio0: {
					// 		designation: 'SSPND',
					// 		direction: 'out'
					// 	},

					// 	gpio1: {
					// 		designation: 'Gpio',
					// 		direction: 'in'
					// 	},
					// 	gpio2: {
					// 		designation: 'Gpio',
					// 		direction: 'in'
					// 	},

					// 	gpio3: {
					// 		designation: 'LED I2C',
					// 		direction: 'out'
					// 	}

					})
					// console.log(result)

					const sramGet = await this.#device.sram.get()
					console.log(sramGet)

					const gpioInfo = await this.#device.gpio.get()
					console.log(gpioInfo)

					const status = await this.#device.common.status({ cancelI2c: true })
					console.log({ status })




					// const status11 = await this.#device.common.status({ i2cClock: 400 })
					// console.log({ status11 })

					// const status1 = await this.#device.common.status({ cancelI2c: false, })
					// console.log({ status1 })


					// const result1 = await this.#device.i2c.writeData({
					// 	address: 0x77,
					// 	buffer: Uint8Array.from([ 0xD0 ])
					// })

					// console.log({ result1 })

					// const status2 = await this.#device.common.status()
					// console.log({ status2 })

					// //const status2 = await this.#device.common.status({ i2cClock: 200 })
					// const result2 = await this.#device.i2c.readData({
					// 			address: (0x77 << 1),
					// 			length: 1
					// 		})

					// console.log({ result2 })

					// for await(const address of range(0x08, 0x77)) {
					// 	const result = await this.#device.i2c.readData({
					// 		address: address << 1,
					// 		length: 1
					// 	})
					// 	console.log(address, result)
					// }
				})

			// const vbus =  I2CBusMCP2221.from(this.#device, { opaquePrefix: 'mcp2221:s:' })

			// ui.addI2CDevice({
			// 	type: '',
			// 	bus: vbus
			// })


		}, { once: true })



		return root
	}
}