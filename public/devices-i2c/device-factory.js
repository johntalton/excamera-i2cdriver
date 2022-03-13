
import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { TCA9548Builder } from './tca9548a.js'


export class I2CDeviceBuilderFactory {
	static async from(definition, ui) {
		return TCA9548Builder.builder(definition, ui)
	}
}
