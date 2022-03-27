
import { BoschIEU } from '@johntalton/boschieu'
import { I2CAddressedBus } from '@johntalton/and-other-delights'

export class BoschIEUBuilder {
	#abus
	#device

	static async builder(definition, ui) {
		return new BoschIEUBuilder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'Bosch IEU' }

	async open() {
		this.#device = await BoschIEU.sensor(this.#abus, {})
	}

	async close() {}

	signature() {}

	async buildCustomView(selectionElem) {
		const root = document.createElement('boschieu-config')


    return root
  }
}