import { COMMAND_REPLY_LENGTH_NONE } from './defs.js'

export const EMPTY_RESULT = {
	bytesRead: 0,
	buffer: undefined // new ArrayBuffer(0)
}

export class CoreExcameraLabsI2CDriver {
	static defaultTimeoutMs = 1000 * 0.25

	static async #streamChunkReadBYOB(
		port,
		recvLength,
		readBuffer,
		{
			signal = undefined,
			timeoutMs = CoreExcameraLabsI2CDriver.defaultTimeoutMs
		} = {}) {

		if (port.readable === null) { throw new Error('null readable') }
		if (port.readable.locked) { throw new Error('locked reader') }
		if (signal?.aborted ?? false) { throw new Error('read aborted') }

		const reader = port.readable.getReader({ mode: 'byob' })

		const flags = {
			aborted: false,
			timedout: false
		}

		signal?.addEventListener('abort', event => {
			console.warn('read aborted')
			flags.aborted = true
			reader.cancel()
		})

		const timer = setTimeout(() => {
			console.warn('read timeout')
			flags.timedout = true
			reader.cancel()
		}, timeoutMs)

		let offset = ArrayBuffer.isView(readBuffer) ? readBuffer.byteOffset : 0
		let buffer = ArrayBuffer.isView(readBuffer) ? readBuffer.buffer : readBuffer
		let bytesRead = 0

		try {
			while (true) {
				const { value, done } = await reader.read(new Uint8Array(buffer, offset, recvLength - bytesRead))
				if (done) { break }

				buffer = value.buffer
				offset += value.byteLength
				bytesRead += value.byteLength

				if (bytesRead === recvLength) { break }
				if (bytesRead > recvLength) { break }

				if(flags.aborted || flags.timedout) {
					throw new Error(`read canceled by ${flags.aborted ? 'abort signal' : 'timeout'}`)
				}
			}

			return {
				bytesRead,
				buffer
			}
		}
		catch(e) { throw e }
		finally {
			clearTimeout(timer)
			reader.releaseLock()
		}

		throw new Error('exit')
	}

	/**
	 * @param {SerialPort} port
	 * @param {ArrayBuffer|ArrayBufferView|undefined} readBuffer
	 * @param {ArrayBuffer|ArrayBufferView|undefined} sendBuffer
	 * @returns {Promise<{ buffer: ArrayBuffer|ArrayBufferView|undefined, bytesRead: number }>}
	*/
	static async sendRecvCommand(
		port,
		command,
		sendBuffer = undefined,
		recvLength = 0,
		readBuffer = undefined,
		options = {}) {

		const { signal } = options

		const defaultWriter = port.writable.getWriter()

		try {
			await defaultWriter.ready

			if(signal !== undefined && signal.aborted) {
				console.warn('sendRecvCommand aborted before write')
				// return EMPTY_RESULT
				throw new Error('aborted via signal before write')
			}

			const commandBuffer = Uint8Array.from([ command ])

			if(true) {
				// this approach join the buffers resulting in
				// a single call to the writer.
				const parts = sendBuffer !== undefined ? [ commandBuffer, sendBuffer ] : [ commandBuffer ]
				const blob = new Blob(parts)
				const buffer = await blob.arrayBuffer()
				await defaultWriter.write(buffer)
			}
			else {
				// this approach uses disjoint writes to send the command
				// and potential data buffer.
				await defaultWriter.write(commandBuffer)
				if(sendBuffer !== undefined) {
					await defaultWriter.write(sendBuffer)
				}
			}

			if (recvLength === undefined || recvLength <= 0) {
				return EMPTY_RESULT
			}

			if(signal !== undefined && signal.aborted) {
				console.warn('sendRecvCommand aborted after write')
				// return EMPTY_RESULT
				throw new Error('aborted via signal after write')
			}

			// return await here as otherwise the finally block will release the lock before the read
			return await CoreExcameraLabsI2CDriver.#streamChunkReadBYOB(port, recvLength, readBuffer, options)
		}
		catch (e) {
			throw e
		}
		finally {
			await defaultWriter.ready
			await defaultWriter.releaseLock()
		}
	}

	static async sendCommandNoReply(port, command, sendBuffer, options) {
		return CoreExcameraLabsI2CDriver.sendRecvCommand(port, command, sendBuffer, COMMAND_REPLY_LENGTH_NONE, undefined, options)
			.then(_ => {})
	}

	static async sendCommandOnly(port, command, options) {
		return CoreExcameraLabsI2CDriver.sendCommandNoReply(port, command, undefined, options)
	}

	static async sendRecvTextCommand(port, textCommand, sendBuffer, recvLength, options) {
		const encoder = new TextEncoder()
		const encoded = encoder.encode(textCommand)

		const command = encoded[0]
		const readBuffer = new ArrayBuffer(recvLength)
		return CoreExcameraLabsI2CDriver.sendRecvCommand(port, command, sendBuffer, recvLength, readBuffer, options)
	}
}