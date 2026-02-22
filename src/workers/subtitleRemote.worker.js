/* global self OffscreenCanvas */

import LRUCache from '../lib/LRUCache'

const cache = new LRUCache({ maxBytes: 50 * 1024 * 1024 })
const KEEP_AHEAD_MS = 3000

// keep some past (for quick back seeks) + some future (to stay ahead)
const stepOffsetsSec = [-10, -5, -2, -1, 1, 2, 5, 10, 20]

let url
let stepMs
let subName
let debug = null
let ready = false

let offCanvas, offCanvasCtx, offscreenRender

let lastCurrentTime = 0, lastRenderedTMs = 0

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

/**
 * @param {Number} tMs
 * @return {Number}
 */
const quantizeTimeMs = (tMs) => Math.round(tMs / stepMs) * stepMs

/**
 * @param {Number} tMs
 * @returns {Promise<ArrayBuffer|null>}
 */
const fetchFrame = async (tMs) => {
    const r = await fetch(`${url}/render`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            tMs,
            width: self.width,
            height: self.height,
            subName
        })
    })
    let out = null
    if (r.status === 200) {
        out = await r.arrayBuffer()
    }
    return out
}

/**
 * Request a frame only once.
 * cache values:
 *  - undefined: not requested
 *  - false: requested / in-flight
 *  - null: requested / no frame
 *  - ArrayBuffer: requested / has frame
 */
const requestFrame = (tMs) => {
    const v = cache.peek(tMs)
    if (v === undefined) {
        cache.set(tMs, false)
        fetchFrame(tMs).then(buf => {
            cache.set(tMs, buf)
        }).catch(e => {
            cache.delete(tMs)
            console.error('requestFrame', e)
        })
    }
}

function b64ToU8(b64) {
    const bin = atob(b64)
    const u8 = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
    return u8.buffer
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
                    for (const key in times) total += times[key]
                    console.log('Bitmaps: ' + images.length + ' Total: ' + (total | 0) + 'ms', times)
                }
                self.postMessage({ target: 'unbusy' })
            }
        }
    } else {
        self.postMessage(resultObject, buffers)
    }
}

const render = async (time, force) => {
    const times = {}
    const renderStartTime = performance.now()
    const tMs = quantizeTimeMs(time * 1000)

    if (debug) {
        const decodeEndTime = performance.now()
        const renderEndTime = decodeEndTime
        times.WASMRenderTime = renderEndTime - renderStartTime
        times.WASMBitmapDecodeTime = decodeEndTime - renderEndTime
        times.JSRenderTime = Date.now()
    }

    if (lastRenderedTMs !== tMs || force) {
        const images = []
        const buffers = []

        try {
            const buf = cache.get(tMs)

            if (buf && buf !== false) {
                images.push({ w: self.width, h: self.height, x: 0, y: 0, image: buf })
                buffers.push(buf)
                lastRenderedTMs = tMs
                await paintImages({ images, buffers, times })
            } else {
                if (buf === null) {
                    lastRenderedTMs = tMs
                }
                await paintImages({ images, buffers, times })
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
    lastRenderedTMs = 0
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

const setTrack = async (content) => {
    await destroy()
    const r = await fetch(`${url}/init`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            content,
            stepMs,
            width: self.width,
            height: self.height,
            quantityMs: KEEP_AHEAD_MS,
            subName
        })
    })
    const data = await r.json()

    for (const f of data.frames) {
        cache.set(f.t_ms, f.data ? b64ToU8(f.data) : null)
    }
    ready = true
    self.postMessage({ target: 'ready' })
}

const init = async (data) => {
    self.width = data.width
    self.height = data.height
    stepMs = Math.round(1000 / (data.fpsObjetivo || 30))
    url = data.wasmUrl
    subName = data.subUrl.split('/').filter(Boolean).pop()
    debug = data.debug

    asyncRender = typeof createImageBitmap !== 'undefined' && (data.asyncRender ?? true)

    const healtRes = await fetch(`${url}/health?subName=${subName}`)
    if (healtRes.ok) {
        cache.maxBytes = data.maxBytesCache || cache.maxBytes
        await setTrack(data.subContent)
    } else {
        throw new Error('Server is down')
    }
}

const offscreenCanvas = ({ transferable }) => {
    offCanvas = transferable[0]
    offCanvasCtx = offCanvas.getContext('2d')
    offscreenRender = true
}

const detachOffscreen = () => {
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

        const tMs = quantizeTimeMs(time * 1000)

        // always prioritize "now" and "next frame"
        requestFrame(tMs)
        requestFrame(quantizeTimeMs(tMs + stepMs))

        // keep some past/future around to handle quick back seeks and stay ahead
        for (const s of stepOffsetsSec) {
            requestFrame(quantizeTimeMs(tMs + s * 1000))
        }

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