import { readableStream } from './readable-stream.js'
import { byteStream } from './byte-stream.js'
import { eventByteStream } from './event-byte-stream.js'
import { eventStream } from './event-stream.js'
import { normalizedEventStream } from './normalized-event-stream.js'
import { stateMachineStream } from './state-machine-stream.js'

import { i2cStateMachine } from './i2c-state-machine.js'

export function eventStreamFromReader(defaultReader, options) {
  const { signal } = options
  const bytePipeline = byteStream(readableStream(defaultReader, { signal }))
  const eventBytePipeline = eventByteStream(bytePipeline)
  const normalPipeline = normalizedEventStream(eventStream(eventBytePipeline))

  return stateMachineStream(normalPipeline, { state: 'IDLE', machine: i2cStateMachine })
}
