
import { Tca9548a } from '@johntalton/tca9548a'
import { I2CAddressedBus } from '@johntalton/and-other-delights'

export class TCA9548Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new TCA9548Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'TCA9548A Multiplexer' }


	async open() {
		this.#device = await Tca9548a.from(this.#abus, {})
	}

	async close() {}

	signature() {}

	async buildCustomView(selectionElem) {
		const root = document.createElement('tca9548-config')

		root.addEventListener('change', e => {
			const { channels } = e
			console.log('channel change request', channels)

			Promise.resolve()
				.then(async () => {

				await this.#device.setChannels(channels)
				const resultChannels = await this.#device.getChannels()
				console.log({ resultChannels })

				// const allCh = [ 0, 1, 2, 3, 4, 5, 6, 7 ]
				// allCh.forEach(ch => {
				// 	const on = resultChannels.includes(ch)
				// 	console.log('set checkbox for channel', ch, on)
				// })
			})
		})


		return root
	}
}



/*
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
								}, { once: true })
*/

