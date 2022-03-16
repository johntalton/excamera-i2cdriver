import { MCP2221A } from '@johntalton/mcp2221'
import { I2CBusMCP2221 } from '@johntalton/i2c-bus-mcp2221'

import { dumpHIDDevice } from '../util/hid-info.js'
import { range } from '../util/range.js'


async function onceInputReport(hid) {
	return new Promise((resolve, reject) => {
		hid.addEventListener('inputreport', e => {
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
				const { returnValue, reportId, data } = await onceInputReport(this.#hidDevice)
				return data
			},
			write: async sourceBuffer => {
				// console.log('usbWrite', sourceBuffer)
				await this.#hidDevice.sendReport(0, sourceBuffer)
				return sourceBuffer.bytesLength
			}
		}

		this.#device = await MCP2221A.from(binding)


		// await this.#device.common.reset()
		// await this.#device.sram.set()

		// const status = await this.#device.common.status({ })
		// const sramGet = await this.#device.sram.get()
		// console.log({ status, sramGet })

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

			console.log('mcp2221 scan')

			Promise.resolve()
				.then(async () => {

					for await(const address of range(0x08, 0x77)) {
						const result = await this.#device.i2c.readData({
							address: address << 1,
							length: 1
						})
						console.log(address, result)
					}
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