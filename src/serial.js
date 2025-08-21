/**
 * @typedef {Object} CommandOptions
 * @property {AbortSignal} [signal]
 * @property {number} [timeoutMs]
 */

/**
 * @typedef {ArrayBufferLike|ArrayBufferView} TargetReadBuffer
 * @typedef {ArrayBufferLike|ArrayBufferView} SendBuffer
 */

/**
 * @typedef {Object} ReadResult
 * @property {number} bytesRead,
 * @property {TargetReadBuffer} buffer
 */


/** @typedef {Object} SerialPort */

export class CoreExcameraLabsI2CDriver {
	static defaultTimeoutMs = 500

	/**
	 * @param {SerialPort} port
	 * @param {TargetReadBuffer} readBuffer
	 * @param {number} recvLength
	 * @param {CommandOptions} [options]
	 * @returns {Promise<ReadResult>}
	 */
	static async #streamChunkReadBYOB(
		port,
		recvLength,
		readBuffer,
		options) {

		const { signal, timeoutMs } = options ?? {}

		// console.log('#streamChunkReadBYOB', recvLength, readBuffer)

		if (port.readable === null) { throw new Error('null readable') }
		if (port.readable.locked) { throw new Error('locked reader') }
		if (signal?.aborted ?? false) { throw new Error('read aborted') }

		/** @type {ReadableStreamBYOBReader} */
		const reader = port.readable.getReader({ mode: 'byob' })

		const flags = {
			aborted: false,
			timedout: false
		}

		signal?.addEventListener('abort', event => {
			console.warn('read aborted')
			flags.aborted = true
			reader.cancel('Signal Abort')
		})

		const timer = setTimeout(() => {
			console.warn('read timeout')
			flags.timedout = true
			reader.cancel('Timed Out')
		}, timeoutMs ?? CoreExcameraLabsI2CDriver.defaultTimeoutMs)

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
		catch(e) {
			// console.log(buffer, offset, recvLength, bytesRead)
			reader.cancel('Exception')
			throw e
		}
		finally {
			clearTimeout(timer)
			reader.releaseLock()
		}

		throw new Error('exit')
	}

	static async #sendCommand(defaultWriter, command, sendBuffer, options) {
		const { signal } = options ?? {}

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

		if(signal !== undefined && signal.aborted) {
			console.warn('sendRecvCommand aborted after write')
			// return EMPTY_RESULT
			throw new Error('aborted via signal after write')
		}
	}

	/**
	 * @param {SerialPort} port
	 * @param {number} command
	 * @param {TargetReadBuffer} readBuffer
	 * @param {number} recvLength
	 * @param {SendBuffer|undefined} sendBuffer
	 * @param {CommandOptions} [options]
	 * @returns {Promise<ReadResult>}
	*/
	static async sendRecvCommand(
		port,
		command,
		sendBuffer = undefined,
		recvLength = 0,
		readBuffer,
		options) {

		// console.log('sendRecvCommand', command, sendBuffer, recvLength, readBuffer, options)

		if(readBuffer !== undefined && (recvLength > readBuffer.byteLength)) { throw new Error('readBuffer not large enough for requested data') }

		if (recvLength === undefined || recvLength <= 0 || readBuffer === undefined) {
			throw new Error('recvLength or buffer unset')
		}

		const defaultWriter = port.writable.getWriter()

		try {
			await CoreExcameraLabsI2CDriver.#sendCommand(defaultWriter, command, sendBuffer, options)

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

	/**
	 * @param {SerialPort} port
	 * @param {number} command
	 * @param {SendBuffer|undefined} sendBuffer
	 * @param {CommandOptions} [options]
	 * @returns {Promise<void>}
	*/
	static async sendCommandNoReply(
		port,
		command,
		sendBuffer = undefined,
		options) {

		const defaultWriter = port.writable.getWriter()

		try {
			await CoreExcameraLabsI2CDriver.#sendCommand(defaultWriter, command, sendBuffer, options)
		}
		catch (e) {
			throw e
		}
		finally {
			await defaultWriter.ready
			await defaultWriter.releaseLock()
		}
	}

	/**
	 * @param {SerialPort} port
	 * @param {number} command
	 * @param {CommandOptions} [options]
	 */
	static async sendCommandOnly(port, command, options) {
		return CoreExcameraLabsI2CDriver.sendCommandNoReply(port, command, undefined, options)
	}

	/**
	 * @param {SerialPort} port
	 * @param {string} textCommand
	 * @param {SendBuffer|undefined} sendBuffer
	 * @param {number|undefined} recvLength
	 * @param {CommandOptions} [options]
	 */
	static async sendRecvTextCommand(port, textCommand, sendBuffer, recvLength, options) {
		const encoder = new TextEncoder()
		const encoded = encoder.encode(textCommand)

		const [ command ] = encoded
		const readBuffer = new ArrayBuffer(recvLength)
		return CoreExcameraLabsI2CDriver.sendRecvCommand(port, command, sendBuffer, recvLength, readBuffer, options)
	}
}