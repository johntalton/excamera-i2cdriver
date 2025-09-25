export const EXCAMERA_LABS_VENDOR_ID = 0x0403
export const EXCAMERA_LABS_PRODUCT_ID = 0x6015
export const EXCAMERA_LABS_MINI_PRODUCT_ID = 0x6015

export const COMMAND_MASK_READ_NACK_FINAL = 0x80
export const COMMAND_MASK_WRITE = 0xc0

//
export const COMMAND_TRANSMIT_STATUS_INFO = 0x3f // '?'
export const COMMAND_TRANSMIT_INTERNAL_STATE = 0x4a // 'J'
export const COMMAND_ECHO_BYTE = 0x65 // 'e'

export const COMMAND_SET_SPEED_100 = 0x31 // '1'
export const COMMAND_SET_SPEED_400 = 0x34 // '4'
//
export const COMMAND_START = 0x73 // 's'
export const COMMAND_READ_ACK_ALL = 0x61 // 'a'
export const COMMAND_STOP = 0x70 // 'p'
export const COMMAND_RESET_BUS = 0x78 //'x'
export const COMMAND_READ_REGISTER = 0x72 // 'r'
export const COMMAND_SCAN = 0x64 // 'd'

//
export const COMMAND_MONITOR_ENTER_MODE = 0x6d // 'm'
export const COMMAND_MONITOR_EXIT_MODE = 0x20 // ' '

//
export const COMMAND_CAPTURE_ENTER_MODE = 0x63 // 'c'

//
export const COMMAND_BITBANG_ENTER_MODE = 0x62 // 'b'
export const COMMAND_BITBANG_CONTROL = 0x62 // 'b'
export const COMMAND_BITBANG_END_COMMAND = 0x40 // @
export const COMMAND_BITBANG_EXIT_MODE = 0x69 // 'i'

//
export const COMMAND_SET_PULLUP_CONTROL = 0x75 // 'u'

//
export const COMMAND_REBOOT = 0x5f // '_'

//
export const COMMAND_EFF = 0x66 // 'f'
export const COMMAND_UHOO = 0x76 // 'v' start weight
export const COMMAND_DUBU = 0x77 // 'w' weight



export const COMMAND_REPLY_LENGTH_NONE = 0
export const COMMAND_REPLY_LENGTH_SINGLE_BYTE = 1
export const COMMAND_REPLY_LENGTH_SCAN = 112
export const COMMAND_REPLY_LENGTH_TRANSMIT_STATUS_INFO = 80
export const COMMAND_REPLY_LENGTH_INTERNAL_STATE = 80


export const PULLUP_0_0_K = 0b000
export const PULLUP_2_2_K = 0b001
export const PULLUP_4_3_K = 0b010
export const PULLUP_1_5_K_ALT = 0b011
export const PULLUP_4_7_K = 0b100
export const PULLUP_1_5_K = 0b101
export const PULLUP_2_2_K_ALT = 0b110
export const PULLUP_1_1_K = 0b111

/** @type {Record<number, string>} */
export const PULLUP_LOOKUP = {
	[PULLUP_0_0_K]: 'Zero',
	[PULLUP_2_2_K]: '2.2K',
	[PULLUP_4_3_K]: '4.3K',
	[PULLUP_1_5_K_ALT]: '1.5K (alt)',
	[PULLUP_4_7_K]: '4.7K',
	[PULLUP_1_5_K]: '1.5K',
	[PULLUP_2_2_K_ALT]: '2.2K (alt)',
	[PULLUP_1_1_K]: '1.1K'
}
