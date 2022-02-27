

const PULLUP_0_0_K = 0b000
const PULLUP_2_2_K = 0b001
const PULLUP_4_3_K = 0b010
const PULLUP_1_5_K_ALT = 0b011
const PULLUP_4_7_K = 0b100
const PULLUP_1_5_K = 0b101
const PULLUP_2_2_K_ALT = 0b110
const PULLUP_1_1_K = 0b111

const PULLUP_LOOKUP = {
	[PULLUP_0_0_K]: 'Zero',
	[PULLUP_2_2_K]: '2.2K',
	[PULLUP_4_3_K]: '4.3K',
	[PULLUP_1_5_K_ALT]: '1.5K (alt)',
	[PULLUP_4_7_K]: '4.7K',
	[PULLUP_1_5_K]: '1.5K',
	[PULLUP_2_2_K_ALT]: '2.2K (alt)',
	[PULLUP_1_1_K]: '1.1K'
}


export class ResponseBufferPasrser {
	static parsePullup(b) {
		const pullup_mask = 0b111
		const sda = b & pullup_mask
		const scl = (b >> 3) & pullup_mask
		return {
			b,
			sda: PULLUP_LOOKUP[sda],
			sdaValue: sda,
			scl: PULLUP_LOOKUP[scl],
			sclValue: scl
		}
	}

	static parseTransmitStatusInfo(buffer) {
		const decoder = new TextDecoder()
		const str = decoder.decode(buffer)

		const [
			identifier,
			serial,
			uptime,
			voltage,
			current,
			temperature,
			mode,
			sda,
			scl,
			speed,
			pullups,
			crc
		] = str.slice(1, -1).split(' ')
	
		return {
			identifier,
			serial,
			uptime: parseInt(uptime, 10),
			voltage: parseFloat(voltage),
			current: parseFloat(current),
			temperature: parseFloat(temperature),
			mode,
			sda: parseInt(sda, 2),
			scl: parseInt(scl, 2),
			speed: parseInt(speed, 10),
			pullups: ResponseBufferPasrser.parsePullup(parseInt(pullups, 16)),
			crc: parseInt(crc, 16) //  CRC-16-CCITT
		}
	}

	static parseEchoByte(buffer) {
		if(buffer.byteLength <= 0) { throw new Error('length missmatch') }
		return buffer[0]
	}

	static parseStart(buffer) {
		if(buffer.byteLength !== 1) { throw new Error('length missmatch') }
		const reserved5 = 0b00110
		const arb_mask = 0b100
		const to_mask = 0b010
		const ack_mask = 0b001

		const b = buffer[0]
		
		const valid = ((b >> 3) & reserved5) === reserved5

		return {
			valid,
			arb: b & arb_mask,
			to: b & to_mask,
			ack: b & ack_mask
		}
	}

	static parseRegister(buffer) {
		if(buffer.byteLength !== 1) { throw new Error('length missmatch') }
		return buffer[0]
	}

	static parseResetBus(buffer) {
		const sda_mask = 0b10
		const scl_mask = 0b01
		const b = buffer[0]
		const sda = b & sda_mask
		const scl = b & scl_mask
		return {
			sda, scl
		}
	}

	static parseScan(buffer) {
		const startDev = 0x08
		// scan range 0x08 to 0x77

		if(buffer.byteLength !== 112) { throw new Error('length missmatch') }

		return [ ...buffer ]
			.map(b => ResponseBufferPasrser.parseStart(Uint8Array.from([ b ])))
			.map((result, index) => ({
				...result,
				dev: startDev + index
			}))
	}

	static parseInternalStatus(buffer) {

		const decoder = new TextDecoder()
		const str = decoder.decode(buffer)

		// id ds sp SMB0CF SMB0CN T2 T3 IE EIE1 P0 P0MDIN P0MDOUT P1 P1MDIN P1MDOUT P2 P2MDOUT"

		const [
			id, ds, sp, smb0cf, smb0cn, t2, t3, ie, eie1,
			p0, p0mdin, p0mdout, p1, p1mdin, p1mdout, p2, p2mdout,
			convs
		] = str.slice(1, -1).split(' ').map(hex => parseInt(hex, 16))

		return {
			id, ds, sp, smb0cf, smb0cn, t2, t3, ie, eie1,
			p0, p0mdin, p0mdout, p1, p1mdin, p1mdout, p2, p2mdout,
			convs
		}
	}
}
