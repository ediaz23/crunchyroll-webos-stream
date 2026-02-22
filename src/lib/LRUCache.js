
/**
 * @callback SizeFn
 * @param {Object} obj
 * @returns {Number}
 *
 * @typedef LRUOptions
 * @type {Object}
 * @property {Number} [maxSize] max elements
 * @property {Number} [maxBytes] max bytes
 * @property {SizeFn} [size] function to get byte size
 * @property {Function} [onEviction] Called right before an item is evicted from the cache.
 */

export default class LRUCache {

    /**
     * @param {LRUOptions} [options={}]
     */
    constructor(options = {}) {
        if (!options.maxSize && !options.maxBytes) {
            throw new TypeError('Either `maxSize` or `maxBytes` must be provided')
        }
        if (options.maxSize && !(options.maxSize > 0)) {
            throw new TypeError('`maxSize` must be a number greater than 0')
        }
        if (options.maxBytes && !(options.maxBytes > 0)) {
            throw new TypeError('`maxBytes` must be a number greater than 0')
        }

        this.maxSize = options.maxSize || 0
        this.maxBytes = options.maxBytes || 0

        this.onEviction = options.onEviction
        this.sizeFn = typeof options.size === 'function'
            ? options.size
            : (value => (value && typeof value.byteLength === 'number' ? value.byteLength : 1))

        this.cache = new Map() // key -> { value, size }
        this._size = 0
        this._bytes = 0
    }

    _evictIfNeeded() {
        while (this.maxSize && this._size > this.maxSize) {
            const key = this.cache.keys().next().value
            this.delete(key)
        }

        while (this.maxBytes && this._bytes > this.maxBytes) {
            const key = this.cache.keys().next().value
            this.delete(key)
        }
    }

    _touch(key, entry) {
        this.cache.delete(key)
        this.cache.set(key, entry)
    }

    _getEntry(key, touch) {
        if (this.cache.has(key)) {
            const entry = this.cache.get(key)
            if (touch) {
                this._touch(key, entry)
            }
            return entry
        }
    }

    get(key) {
        const entry = this._getEntry(key, true)
        return entry ? entry.value : undefined
    }

    set(key, value) {
        const newSize = Number(this.sizeFn(value)) || 0

        if (this.cache.has(key)) {
            const entry = this.cache.get(key)
            this._bytes -= entry.size
            entry.value = value
            entry.size = newSize
            this._bytes += newSize
            this._touch(key, entry)
        } else {
            const entry = { value, size: newSize }
            this.cache.set(key, entry)
            this._size++
            this._bytes += newSize
        }

        this._evictIfNeeded()
        return this
    }

    has(key) {
        return this.cache.has(key)
    }

    peek(key) {
        const entry = this._getEntry(key, false)
        return entry ? entry.value : undefined
    }

    delete(key) {
        if (!this.cache.has(key)) {
            return false
        }

        const entry = this.cache.get(key)
        this.cache.delete(key)
        this._size--
        this._bytes -= entry.size

        if (typeof this.onEviction === 'function') {
            this.onEviction(key, entry.value)
        }

        return true
    }

    clear() {
        if (typeof this.onEviction === 'function') {
            for (const [key, entry] of this.cache.entries()) {
                this.onEviction(key, entry.value)
            }
        }

        this.cache.clear()
        this._size = 0
        this._bytes = 0
    }

    * keys() {
        for (const [key] of this) {
            yield key
        }
    }

    * values() {
        for (const [, value] of this) {
            yield value
        }
    }

    *[Symbol.iterator]() {
        for (const [key, entry] of this.cache.entries()) {
            yield [key, entry.value]
        }
    }

    get size() {
        return this._size
    }

    get bytes() {
        return this._bytes
    }
}

