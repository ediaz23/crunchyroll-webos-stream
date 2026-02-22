/* global self OffscreenCanvas */

import LRUCache from '../lib/LRUCache'

/**
 * @typedef SubEvent
 * @type {Object}
 * @property {Number} id
 * @property {Number} start_ms
 * @property {Number} end_ms
 * @property {Number} dur_ms
 * @property {'static'|'dynamic'} type
 */
/** @type {Array<SubEvent>} */
const eventList = []
const cache = new LRUCache({ maxBytes: 50 * 1024 * 1024 })
const KEEP_AHEAD_MS = 3000


let url
let subName
let debug = null
let ready = false

let offCanvas, offCanvasCtx, offscreenRender

let lastCurrentTime = 0, lastEventRendered = null

let asyncRender = false
let subtitleColorSpace = null

if (typeof console === 'undefined') {
    const msg = (command, a) => {
        self.postMessage({
            target: 'console',
            command,
            content: JSON.stringify(Array.prototype.slice.call(a))
        })
    }
    self.console = {
        log: function() { msg('log', arguments) },
        debug: function() { msg('debug', arguments) },
        info: function() { msg('info', arguments) },
        warn: function() { msg('warn', arguments) },
        error: function() { msg('error', arguments) }
    }
    console.log('Detected lack of console, overridden console')
}

const u32le = (u8, o) => (u8[o]) | (u8[o + 1] << 8) | (u8[o + 2] << 16) | (u8[o + 3] << 24) >>> 0
const i32le = (u8, o) => (u8[o]) | (u8[o + 1] << 8) | (u8[o + 2] << 16) | (u8[o + 3] << 24)

/**
 * @param {ArrayBuffer} buf
 * @return {Array<{id: Number, data: ArrayBuffer}>}
 */
const parseBinaryFile = (buf) => {
    const u8 = new Uint8Array(buf)
    let o = 0

    if (u8[o] !== 87 || u8[o + 1] !== 82 || u8[o + 2] !== 77 || u8[o + 3] !== 83) {  // MAGIC 'WRMS'
        throw new Error('Invalid batch magic')
    }
    o += 4

    const ver = u8[o]; o += 1
    if (ver !== 1) {
        throw new Error('Unsupported batch version ' + ver)
    }

    /** @type {Array<{id: Number, data: ArrayBuffer}>} */
    const out = []
    const count = (u8[o]) | (u8[o + 1] << 8)
    o += 2

    for (let i = 0; i < count; i++) {
        const id = i32le(u8, o); o += 4
        const len = u32le(u8, o); o += 4
        if (len === 0) {
            out.push({ id, data: null })
        } else {
            out.push({ id, data: u8.slice(o, o + len).buffer })
            o += len
        }
    }
    return out
}

/**
 * @param {Number} tms
 * @returns {Number}
 */
function findEventIndex(tms) {
    let left = 0
    let right = eventList.length - 1

    while (left <= right) {
        const mid = (left + right) >> 1
        const item = eventList[mid]

        if (tms < item.start_ms) {
            right = mid - 1
        } else if (tms >= item.end_ms) {
            left = mid + 1
        } else {
            left = mid
            break
        }
    }

    left = left < 0 ? 0 : left
    left = left >= eventList.length ? eventList.length - 1 : left

    return left
}

/**
 * @param {Array<Number>} tMsList
 * @returns {Promise<ArrayBuffer|null>}
 */
const fetchEvents = async (eventIndexList) => {
    const r = await fetch(`${url}/render`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            subName,
            width: self.width,
            height: self.height,
            eventIndexList,
        })
    })
    let out = null
    if (r.status === 200) {
        out = await r.arrayBuffer()
    }
    return out
}


const requestEvent = (time) => {
    const tMs = time * 1000
    const maxPrefetch = 3
    const indexList = []
    let evIndex = findEventIndex(tMs)

    for (let i = 0; i < maxPrefetch; ++i) {
        if (evIndex < eventList.length) {
            if (cache.peek(eventList[evIndex].id) === undefined) {
                cache.set(eventList[evIndex].id, false)
                indexList.push(evIndex)
            }
        }
        evIndex += 1
    }

    if (indexList.length) {
        fetchEvents(indexList).then(parseBinaryFile).then(arr => {
            for (const i of arr) {
                cache.set(i.id, i.data)
            }
        }).catch(e => {
            for (const index of indexList) {
                cache.delete(eventList[index].id)
            }
            console.error('requestFrame', e)
        })
    }
}

const paintImages = async ({ times, images, buffers }) => {
    const resultObject = {
        target: 'render',
        asyncRender,
        images,
        times,
        width: self.width,
        height: self.height,
        colorSpace: subtitleColorSpace
    }

    if (offscreenRender) {
        if (offCanvas.height !== self.height || offCanvas.width !== self.width) {
            if (!isNaN(self.width)) offCanvas.width = self.width
            if (!isNaN(self.height)) offCanvas.height = self.height
        }

        offCanvasCtx.clearRect(0, 0, self.width, self.height)

        let drewSomething = false
        for (const image of images) {
            if (image && image.image && offCanvasCtx && typeof offCanvasCtx.drawImage === 'function') {
                try {
                    if (asyncRender && typeof self.createImageBitmap === 'function' && image.image instanceof ArrayBuffer) {
                        const bmp = await self.createImageBitmap(new Blob([image.image], { type: 'image/webp' }))
                        try {
                            offCanvasCtx.drawImage(bmp, image.x, image.y)
                        } finally {
                            if (typeof bmp.close === 'function') bmp.close()
                        }
                    } else {
                        offCanvasCtx.drawImage(image.image, image.x, image.y)
                        if (typeof image.image.close === 'function') image.image.close()
                    }
                    drewSomething = true
                } catch (e) {
                    console.error('paintImages', e)
                }
            }
        }

        if (offscreenRender === 'hybrid') {
            if (!drewSomething) {
                self.postMessage({ target: 'unbusy' })
            } else {
                if (debug) {
                    times.bitmaps = images.length
                }
                try {
                    const image = offCanvas.transferToImageBitmap()
                    resultObject.images = [{ image, x: 0, y: 0 }]
                    resultObject.asyncRender = true
                    self.postMessage(resultObject, [image])
                } catch (e) {
                    self.postMessage({ target: 'unbusy' })
                }
            }
        } else {
            if (!drewSomething) {
                self.postMessage({ target: 'unbusy' })
            } else {
                if (debug) {
                    times.JSRenderTime = Date.now() - times.JSRenderTime
                    let total = 0
                    for (const key in times) {
                        total += times[key]
                    }
                    console.log('Bitmaps: ' + images.length + ' Total: ' + (total | 0) + 'ms', times)
                }
                self.postMessage({ target: 'unbusy' })
            }
        }
    } else {
        self.postMessage(resultObject, buffers.slice(0))
    }
}

const render = async (time, force) => {
    const times = {}
    const renderStartTime = performance.now()
    const tMs = time * 1000
    const ev = eventList[findEventIndex(tMs)]

    if (debug) {
        const decodeEndTime = performance.now()
        const renderEndTime = decodeEndTime
        times.WASMRenderTime = renderEndTime - renderStartTime
        times.WASMBitmapDecodeTime = decodeEndTime - renderEndTime
        times.JSRenderTime = Date.now()
    }

    if ((lastEventRendered !== ev || force)) {
        const images = []
        const buffers = []
        try {
            const isMyEvent = (ev.start_ms <= tMs && tMs < ev.end_ms)
            const buf = isMyEvent ? cache.get(ev.id) : null

            if (debug) {
                console.log('time: ' + time + ' type: ' + (isMyEvent && ev.type) + ' buf: ' + (buf ? true : buf))
            }
            if (buf && buf !== false) {
                images.push({ w: self.width, h: self.height, x: 0, y: 0, image: buf })
                buffers.push(buf)
                lastEventRendered = ev
                await paintImages({ images, buffers, times })
            } else if (buf === null) {
                lastEventRendered = ev
                await paintImages({ images, buffers, times })
            } else {
                self.postMessage({ target: 'unbusy' })
            }
        } catch (e) {
            console.error('render', e)
            self.postMessage({ target: 'unbusy' })
        }
    } else {
        self.postMessage({ target: 'unbusy' })
    }
}

const freeTrack = () => {
    cache.clear()
    lastCurrentTime = 0
    lastEventRendered = null
}

const destroy = async () => {
    ready = false
    freeTrack()
    await fetch(`${url}/destroy`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subName })
    })
}

const setTrack = async (content, initTimeSec) => {
    await destroy()
    const r = await fetch(`${url}/init`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subName, content })
    })
    const data = await r.json()

    eventList.length = 0
    eventList.push(...data.events)
    const r2 = await fetch(`${url}/initRender`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            subName,
            width: self.width,
            height: self.height,
            quantityMs: KEEP_AHEAD_MS,
            initEvent: findEventIndex(initTimeSec * 1000),
        })
    })
    if (r2.status === 200) {
        const data2 = parseBinaryFile(await r2.arrayBuffer())
        for (const ev of data2) {
            cache.set(ev.id, ev.data)
        }
        ready = true
        self.postMessage({ target: 'ready' })
    } else {
        throw new Error('Error init process')
    }
}

const init = async (data) => {
    self.width = data.width
    self.height = data.height
    url = data.wasmUrl
    subName = data.subUrl.split('/').filter(Boolean).pop()
    debug = data.debug

    asyncRender = typeof createImageBitmap !== 'undefined' && (data.asyncRender ?? true)

    const healtRes = await fetch(`${url}/health?subName=${subName}`)
    if (healtRes.ok) {
        cache.maxBytes = data.maxBytesCache || cache.maxBytes
        await setTrack(data.subContent, data.initTimeSec || 0)
    } else {
        throw new Error('Server is down')
    }
}

const offscreenCanvas = ({ transferable }) => {
    if (debug) {
        console.log('offscreenCanvas')
    }
    offCanvas = transferable[0]
    offCanvasCtx = offCanvas.getContext('2d')
    offscreenRender = true
}

const detachOffscreen = () => {
    if (debug) {
        console.log('detachOffscreen')
    }
    offCanvas = new OffscreenCanvas(self.width, self.height)
    offCanvasCtx = offCanvas.getContext('2d', { desynchronized: true })
    offscreenRender = 'hybrid'
}

const canvas = ({ width, height, force }) => {
    if (width == null) {
        throw new Error('Invalid canvas size specified')
    }
    self.width = width
    self.height = height
    if (force) {
        render(lastCurrentTime, true)
    }
}

const demand = async ({ time }) => {
    if (ready) {
        lastCurrentTime = time
        requestEvent(time)
        render(time)
    } else {
        self.postMessage({ target: 'unbusy' })
    }
}


const func = {
    init,
    offscreenCanvas,
    detachOffscreen,
    canvas,
    setTrack,
    freeTrack,
    demand,
    render,
    video: () => { },
    destroy,
    getColorSpace: () => { }
}

self.onmessage = ({ data }) => {
    if (func[data.target]) {
        func[data.target](data)
    } else {
        throw new Error('Unknown event target ' + data.target)
    }
}