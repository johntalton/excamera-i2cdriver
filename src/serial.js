import { COMMAND_REPLY_LENGTH_NONE } from './defs.js'

export class CoreExcameraLabsI2CDriver {
	static READ_TIMEOUT_MS = 1000 * 0.5

	static async #streamChunkReadBYOB(defaultReader, recvLength, readBuffer) {
		const timer = setTimeout(() => {
			console.log('read timeout')
			defaultReader.cancel() // todo async?
		}, CoreExcameraLabsI2CDriver.READ_TIMEOUT_MS)

		let offset = ArrayBuffer.isView(readBuffer) ? readBuffer.byteOffset : 0
		let buffer = ArrayBuffer.isView(readBuffer) ? readBuffer.buffer : readBuffer
		let bytesRead = 0

		try {
			while (true) {
				const { value, done } = await defaultReader.read(new Uint8Array(buffer, offset, recvLength - bytesRead))
				if (done) { break }

				buffer = value.buffer
				offset += value.byteLength
				bytesRead += value.byteLength

				if (bytesRead === recvLength) { break }
				if (bytesRead > recvLength) { break }
			}
		}
		finally {
			clearTimeout(timer)
		}

		return {
			bytesRead,
			buffer
		}
	}

	/**
	 * @param {SerialPort} port
	 * @param {ArrayBufferLike|ArrayBufferView|undefined} sendBuffer
	*/
	static async sendRecvCommand(port, command, sendBuffer, recvLength, readBuffer) {
		if (port.readable === null) { throw new Error('null readable') }
		if (port.readable.locked) { throw new Error('locked reader') }

		const defaultWriter = port.writable.getWriter()
		const defaultBYOBReader = port.readable.getReader({ mode: 'byob' })

		try {
			await defaultWriter.ready

			const commandBuffer = Uint8Array.from([ command ])

			if(false) {
				const parts = sendBuffer !== undefined ? [ commandBuffer, sendBuffer ] : [ commandBuffer ]
				const blob = new Blob(parts)
				const buffer = await blob.arrayBuffer()
				await defaultWriter.write(buffer)
			}
			else {
				await defaultWriter.write(commandBuffer)
				if(sendBuffer !== undefined) {
					await defaultWriter.write(sendBuffer)
				}
			}

			if (recvLength === undefined || recvLength <= 0) {
				return {
					bytesRead: 0,
					buffer: undefined // new ArrayBuffer(0)
				}
			}

			// return await here as otherwise the finally release the lock before the read
			return await CoreExcameraLabsI2CDriver.#streamChunkReadBYOB(defaultBYOBReader, recvLength, readBuffer)
		}
		catch (e) {
			throw e
		}
		finally {
			await defaultWriter.ready

			await defaultBYOBReader.releaseLock()
			await defaultWriter.releaseLock()
		}
	}

	static async sendCommandNoReply(port, command, sendBuffer) {
		return CoreExcameraLabsI2CDriver.sendRecvCommand(port, command, sendBuffer, COMMAND_REPLY_LENGTH_NONE, undefined)
			.then(_ => {})
	}

	static async sendCommandOnly(port, command) {
		return CoreExcameraLabsI2CDriver.sendCommandNoReply(port, command, undefined)
	}

	static async sendRecvTextCommand(port, textCommand, sendBuffer, recvLength) {
		const encoder = new TextEncoder()
		const encoded = encoder.encode(textCommand)

		const command = encoded[0]
		const readBuffer = new ArrayBuffer(recvLength)
		return this.sendRecvCommand(port, command, sendBuffer, recvLength, readBuffer)
			.then(_ => {})
	}
}