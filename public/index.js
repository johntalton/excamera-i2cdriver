import { EXCAMERA_LABS_USB_FILTER } from './devices-serial/exc-i2cdriver.js'

const SUPPORTED_USB_FILTER = [
	EXCAMERA_LABS_USB_FILTER
]

function watchDevices(ui) {
	navigator.serial.addEventListener('connect', (e) => {
    console.log('connect', e.target)
  })

  navigator.serial.addEventListener('disconnect', (e) => {
    console.log('disconnect', e.target)
  })
}

async function scanExistingOpenPorts(ui) {
	const ports = await navigator.serial.getPorts()
	ports.forEach(port => ui.addSerialPort(port))
}

async function requestSerialDevice(filters) {
	return navigator.serial.requestPort(filters)
}

function requestSerialDeviceHandler(ui, event) {
	requestSerialDevice(SUPPORTED_USB_FILTER)
		.then(ui.addSerialPort)
		.catch(e => console.log('issues requesting device', e.message))
}

const build_requestSerialDeviceHandler = ui => event => requestSerialDeviceHandler(ui, event)

//
async function onContentLoaded() {
	const requestDevButton = document.getElementById('requestDevice')

	const ui = {}

	scanExistingOpenPorts(ui)
		.catch(console.warn)

	watchDevices(ui)

	requestDevButton.addEventListener('click', build_requestSerialDeviceHandler(ui), { once: false })
	requestDevButton.disabled = false
}

onContentLoaded()
	.catch(console.warn)
