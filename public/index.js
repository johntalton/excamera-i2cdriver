import { hydrateSerial } from './hydrate/serial.js'
import { hydrateUSB } from './hydrate/usb.js'
import { hydrateHID } from './hydrate/hid.js'

//
import { HTMLImportElement } from './custom-elements/html-import.js'
import { I2CAddressDisplayElement } from './custom-elements/address-display.js'
import { ExcameraI2CDriverElement } from './custom-elements/excamera-i2cdriver.js'
import { MCP2221ConfigElement } from './custom-elements/mcp2221-config.js'
import { CaptureEventElement } from './custom-elements/capture-event.js'
import { TCA9548ConfigElement } from './custom-elements/tca9548-config.js'
import { DS3502ConfigElement } from './custom-elements/ds3502-config.js'

//
import { EXCAMERA_LABS_USB_FILTER, ExcameraI2CDriverUIBuilder } from './devices-serial/exc-i2cdriver.js'
import { MCP2221UIBuilder } from './devices-usb/mcp2221.js'
//
import { I2CDeviceBuilderFactory } from './devices-i2c/device-factory.js'

const MCP2221_USB_FILTER = {
	vendorId: 1240,
	productId: 221
}

function buildDeviceListItem(deviceListElem, builder) {
	const liElem = document.createElement('li')
	const buttonElem = document.createElement('button')
	buttonElem.textContent = builder.title
	liElem.appendChild(buttonElem)
	deviceListElem.appendChild(liElem)


	liElem.addEventListener('click', e => {
		deviceListElem.querySelectorAll('li').forEach(li => li.removeAttribute('data-active'))

		liElem.setAttribute('data-active', true)
		buttonElem.disabled = true

		//
		const mainElem = document.querySelector('main')
		mainElem.querySelectorAll('section').forEach(s => s.removeAttribute('data-active'))

		const sectionElem = document.createElement('section')
		sectionElem.setAttribute('data-active', true)
		sectionElem.setAttribute('data-connect', true)

		sectionElem.setAttribute('data-signature', builder.signature())

		const connectButtonEleme = document.createElement('button')
		connectButtonEleme.textContent = 'Connect to Device'
		sectionElem.appendChild(connectButtonEleme)
		mainElem.appendChild(sectionElem)

		connectButtonEleme.addEventListener('click', e => {
			connectButtonEleme.disabled = true
			connectButtonEleme.remove()

			Promise.resolve()
				.then(builder.open())
				.then(async () => {

					const closeButton = document.createElement('button')
					closeButton.textContent = 'Close Device'
					sectionElem.appendChild(closeButton)

					const signal = {}

					try {
						const customElem = await builder.buildCustomView({ signal })
						sectionElem.appendChild(customElem)
					}
					catch(e) {
						console.error('error buiding view', e)
					}

					closeButton.addEventListener('click', e => {

						sectionElem.remove()

						builder.close()
							.then(() => {
								console.log('closed')
							})
							.catch(console.warn)

					}, { once: true })
				})
				.catch(console.warn)


		}, { once: true })

	}, { once: true })

	//
}

function hydrateCustomeElementTemplateImport(importElemId, name, konstructor) {
	const callback = (mutations, observer) => {
		konstructor.template = element.firstChild
		customElements.define(name, konstructor)
		observer.disconnect()
	}
	const config = { attributes: false, childList: true, subtree: false }
	const observer = new MutationObserver(callback)
	const element = document.getElementById(importElemId)
	observer.observe(element, config)
}

async function hydrateCustomElements() {
	customElements.define('html-import', HTMLImportElement)

	hydrateCustomeElementTemplateImport('capture-event', 'capture-event', CaptureEventElement)
	hydrateCustomeElementTemplateImport('addr-display', 'addr-display', I2CAddressDisplayElement)
	hydrateCustomeElementTemplateImport('mcp2221-config', 'mcp2221-config', MCP2221ConfigElement)
	hydrateCustomeElementTemplateImport('excamera-i2cdriver', 'excamera-i2cdriver', ExcameraI2CDriverElement)
	hydrateCustomeElementTemplateImport('tca9548-config', 'tca9548-config', TCA9548ConfigElement)
	hydrateCustomeElementTemplateImport('ds3502-config', 'ds3502-config', DS3502ConfigElement)
}

async function hydrateEffects() {
	return

	setInterval(() => {
		const root = document.querySelector(':root')
		console.log(root.style)
		const currentStr = root.style.getPropertyValue('--color-accent--h')

		console.log({ currentStr })
		const current = currentStr === '' ? 180 : parseInt(currentStr)
		const next = (current === NaN ? 180 : current) + ((Math.random() > 0.5) ? -2 : 3)

		root.style.setProperty('--color-accent--h', next)
	}, 1000)
}

//
async function onContentLoaded() {
	if (HTMLScriptElement.supports && HTMLScriptElement.supports('importmap')) {
		// console.log('Your browser supports import maps.')
	}
	else {
		console.error('importmap support not available')
	}

	const serialWorker = new Worker('./serial-worker.js', { type: 'module' })
	serialWorker.onmessage = msg => console.log(msg)
	//serialWorker.postMessage({ go: true })

	const requestSerialButton = document.getElementById('requestSerial')
	const requestUSBButton = document.getElementById('requestUSB')
	const requestHIDButton = document.getElementById('requestHID')

	const deviceListElem = document.getElementById('deviceList')

	const ui = {
		addSerialPort: async port => {
			//console.log('addSerialPort')

			const info =  port.getInfo()

			if(info.usbVendorId === EXCAMERA_LABS_USB_FILTER.usbVendorId) {
				//console.log('adding excamera i2cdriver', port)

				const builder = await ExcameraI2CDriverUIBuilder.builder(port, ui)
				buildDeviceListItem(deviceListElem, builder)
				return
			}

			//console.log('no driver for serial port', info)
		},
		addUSBDevice: async device => {
			console.warn('no usb devices supported')
		},
		addHIDDevice: async hid => {
			console.log('UI:addHID', hid.serialNumber, hid.productName)

			if(hid.vendorId === MCP2221_USB_FILTER.vendorId) {
				if(hid.productId == MCP2221_USB_FILTER.productId) {
					//console.log('adding mcp2221', hid)

					const builder = await MCP2221UIBuilder.builder(hid, ui)
					buildDeviceListItem(deviceListElem, builder)
					return
				}
			}
			//console.log('no driver for usb device', device)
		},
		addI2CDevice: async definition => {
			console.log('i2c device to list', definition)
			const builder = await I2CDeviceBuilderFactory.from(definition, ui)
			buildDeviceListItem(deviceListElem, builder)
			return
		}
	}

	await Promise.all([
		hydrateCustomElements(),
		hydrateSerial(requestSerialButton, ui),
		hydrateUSB(requestUSBButton, ui),
		hydrateHID(requestHIDButton, ui),

		hydrateEffects()
	])
}

const syncOnContentLoaded = () => {
	onContentLoaded()
		.catch(console.warn)
}

(document.readyState === 'loading') ?
	document.addEventListener('DOMContentLoaded', syncOnContentLoaded) :
	syncOnContentLoaded()
