import { range } from '../util/range.js'

export const TCA9548_INFO = {
	addresses: [ ...range(0x70, 0x77) ], name: 'tca9548a'
}

export const DS3502_INFO = {
	addresses: [ ...range(0x28, 0x2b) ], name: 'ds3502'
}

export const BOSCH_IEU_INFO = {
	addresses: [ 0x76, 0x77 ], name: 'boschIEU'
}


export const I2C_GUESSES =[
	// 0x00
	// 0x10
	{ addresses: [ ...range(0x18, 0x1F) ], name: 'mcp9808' },
	// 0x20
	{ addresses: [ ...range(0x20, 0x27) ], name: 'mcp23xxx' },
	{ addresses: [ 0x29 ], name: 'tcs34725' },
	{ addresses: [ ...range(0x28, 0x2b) ], name: 'ds1841' },
	DS3502_INFO,
	{ addresses: [ 0x2d, 0x53, 0x57 ], name: 'st25dv16k' },
	// 0x30
	{ addresses: [ 0x30 ], name: 'Trust M' },
	{ addresses: [ 0x3c, 0x3d ], name: 'ssd1306' },
	{ addresses: [ 0x3c, 0x3d ], name: 'adxl375' },
	{ addresses: [ 0x38 ], name: 'AHT20' },
	// 0x40
	{ addresses: [ ...range(0x48, 0x4b) ], name: 'ads1115' },
	{ addresses: [ 0x4a, 0x4b ], name: 'bno085' },
	{ addresses: [ ...range(0x40,  0x4f), ], name: 'ina219' },
	// 0x50
	{ addresses: [ 0x5c ], name: 'am2320' },
	{ addresses: [ 0x5c ], name: 'am2315' },
	{ addresses: [ ...range(0x50, 0x57) ], name: 'Adafruit 24LC32' },
	{ addresses: [ ...range(0x50, 0x57) ], name: 'mb85rc' },
	// 0x60
	{ addresses: [ 0x62, 0x63 ], name: 'mcp4725a1'},
	{ addresses: [ 0x68 ], name: 'pcf8523'},
	// 0x70
	TCA9548_INFO,
	BOSCH_IEU_INFO
]

export function deviceGuessByAddress(address) {
	return I2C_GUESSES
		.sort((a, b) => a.addresses.length < b.addresses.length ? -1 : 1)
		.filter(item => item.addresses.includes(address))
}