

const STATES = {
	IDLE: 'IDLE',
	WARM_IDLE: 'WARM',
	STOPPED: 'STOPPED',

	ADDRESSING: 'STARTED',
	ADDRESSED: 'ADDRESSED',
	ADDRESSED_ACKED: 'ADDRESSED_ACKED',
	TRANSMITION: 'TRANS',
	TRANSMITION_ACKED: 'TRANS_ACKED',
	TRANSMITION_NACK_END: 'TRANS_NACK',



	ERR: 'ERR'
}

export const i2cStateMachine = {
	[STATES.IDLE]: {
		'idle': { target: STATES.IDLE },
		'start': { target: STATES.ADDRESSING, openTransaction: true },
	},
	[STATES.WARM_IDLE]: {
		'idle': { target: STATES.WARM_IDLE },
		'data': { target: STATES.ADDRESSED, setAddress: true },
		'stop': { target: STATES.STOPPED, closeTransaction: true }
	},
	[STATES.STOPPED]: {
		'idle': { target: STATES.WARM_IDLE },
		'data': { target: STATES.ADDRESSED, setAddress: true }, // ?? data while stopped (warm start)
		'start': { target: STATES.ADDRESSING, openTransaction: true }, // not sure?

		'stop': { target: STATES.STOPPED } // no close
	},
	[STATES.ADDRESSING]: {
		'data': { target: STATES.ADDRESSED, setAddress: true },
		'stop': { target: STATES.STOPPED, closeTransaction: true  }
	},
	[STATES.ADDRESSED]: {
		'ack': { target: STATES.ADDRESSED_ACKED },
		'nack': { target: STATES.WARM_IDLE } // no response
	},
	[STATES.ADDRESSED_ACKED]: {
		'data': { target: STATES.TRANSMITION, bufferBytes: true },

		'stop': { target: STATES.STOPPED, closeTransaction: true }
	},
	[STATES.TRANSMITION]: {
		'ack': { target: STATES.TRANSMITION_ACKED, flushBytes: true },
		'nack': { target: STATES.TRANSMITION_NACK_END, flushBytes: true }
	},
	[STATES.TRANSMITION_ACKED]: {
		'stop': { target: STATES.STOPPED, closeTransaction: true },
		'data': { target: STATES.TRANSMITION, bufferBytes: true }
	},
	[STATES.TRANSMITION_NACK_END]: {
		'stop': { target: STATES.STOPPED, clearAddress: true, closeTransaction: true }
	},


	[STATES.ERR]: {
		'*': { target: STATES.ERR }
	}


}
