
export default class OrderedSet {
    constructor() {
        this.map = new Map()
        this.list = []
    }

    add(item) {
        const count = this.map.get(item) || 0
        this.map.set(item, count + 1)
        this.list.push(item)
    }

    has(item) {
        return this.map.has(item)
    }

    remove(item) {
        if (!this.map.has(item)) return

        const count = this.map.get(item)
        if (count > 1) {
            this.map.set(item, count - 1)
        } else {
            this.map.delete(item)
        }

        const index = this.list.indexOf(item)
        if (index > -1) this.list.splice(index, 1)
    }

    indexOf(item) {
        return this.list.indexOf(item)
    }

    get lastElement() {
        return this.list.length ? this.list[this.list.length - 1] : null
    }

    getList() {
        return this.list
    }
}
