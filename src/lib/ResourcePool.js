
export default class ResourcePool {
    constructor(slotIds) {
        this.freeSlots = new Set(slotIds)
        this.queue = []
    }

    async acquire() {
        if (this.freeSlots.size > 0) {
            const slot = this.freeSlots.values().next().value
            this.freeSlots.delete(slot)
            return slot
        }
        return new Promise(resolve => this.queue.push(resolve))
    }

    release(slotId) {
        if (this.queue.length > 0) {
            const next = this.queue.shift()
            next(slotId)
        } else {
            this.freeSlots.add(slotId)
        }
    }
}
