import { MCP2221A } from '@johntalton/mcp2221'

export class MCP2221UIBuilder {
	static async builder(device) {
		return new MCP2221UIBuilder(device)
	}

	constructor(device) { this.device = device }

	get title() { return this.device.productName }

	async open() {
		await this.device.open()
	}

	async buildCustomView() {
		return
	}
}