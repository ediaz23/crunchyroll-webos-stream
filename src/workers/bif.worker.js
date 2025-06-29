/* global self */

const tasks = new Map()  // taskId → { tail: Uint8Array }
const JPEG0 = 0xff
const JPEG1 = 0xd8

self.onmessage = ({ data }) => {
    const { type, taskId } = data

    if (type === 'cancel') {
        tasks.delete(taskId)
        return
    }

    if (type === 'append') {
        const { offset, chunk, last } = data
        if (!tasks.has(taskId)) {
            tasks.set(taskId, { tail: new Uint8Array(0) })
        }

        const entry = tasks.get(taskId)
        const prevLen = entry.tail.length
        const buf = new Uint8Array(prevLen + chunk.length)
        buf.set(entry.tail, 0)
        buf.set(chunk, prevLen)

        const slices = []
        let start = -1

        for (let i = 0; i <= buf.length - 2; i++) {
            if (buf[i] === JPEG0 && buf[i + 1] === JPEG1) {
                if (start !== -1) {
                    const s = offset - prevLen + start
                    const e = offset - prevLen + i
                    slices.push({ start: s, end: e, slice: buf.slice(start, i) })
                }
                start = i
            }
        }

        entry.tail = start !== -1 ? buf.slice(start) : buf.slice()

        if (last) {
            if (entry.tail.length >= 2) {
                const s = offset + chunk.length - entry.tail.length
                const e = offset + chunk.length
                slices.push({ start: s, end: e, slice: entry.tail })
            }
            tasks.delete(taskId)
        }

        if (slices.length) {
            self.postMessage({ taskId, slices }, slices.map(s => s.slice.buffer))
        }
    }
}
