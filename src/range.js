/**
 * @param {number} start
 * @param {number} end
 * @param {number} [step=1]
 * @returns {Generator<number>}
 */
export function* range(start, end, step = 1) {
	yield start
	if (start >= end) return
	yield* range(start + step, end, step)
}
