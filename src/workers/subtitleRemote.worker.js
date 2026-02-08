/* global self OffscreenCanvas */

const cache = new Map()
const KEEP_AHEAD_MS = 2000
const stepOffsetsSec = [-20, -10, -5, 5, 10, 20]
let url
let stepMs
let subName
let debug = null
let offCanvas
let offCanvasCtx
let offscreenRender
let lastCurrentTime = 0, lastRenderedTMs = 0, gcTimer = null
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
        log: function() {
            msg('log', arguments)
        },
        debug: function() {
            msg('debug', arguments)
        },
        info: function() {
            msg('info', arguments)
        },
        warn: function() {
            msg('warn', arguments)
        },
        error: function() {
            msg('error', arguments)
        }
    }
    console.log('Detected lack of console, overridden console')
}

/**
 * @param {Number} tMs
 * @return {Number}
 */
const quantizeTimeMs = (tMs) => Math.round(tMs / stepMs) * stepMs

/**
 * Clear orphans
 */
const gc = () => {
    const tMs = quantizeTimeMs(lastCurrentTime * 1000)
    const maxStepMs = Math.max.apply(null, stepOffsetsSec.map(n => Math.abs(n))) * 1000

    const minT = tMs - maxStepMs - 5000
    const maxT = tMs + maxStepMs + 5000

    for (const k of cache.keys()) {
        if (k < minT || k > maxT) cache.delete(k)
    }
}

/**
 * @param {Number} tMs
 * @returns {Promise<ArrayBuffer>}
 */
const fetchFrame = async (tMs) => {
    const r = await fetch(`${url}/render`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            tMs,
            width: self.width,
            height: self.height,
            subName,
        })
    })
    let out = null
    if (r.status === 200) {
        out = await r.arrayBuffer()
    }
    return out
}

function b64ToU8(b64) {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8.buffer;
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
            if (!isNaN(self.width)) {
                offCanvas.width = self.width
            }
            if (!isNaN(self.height)) {
                offCanvas.height = self.height
            }
        }

        offCanvasCtx.clearRect(0, 0, self.width, self.height)

        let drewSomething = false
        let bitmap = null
        for (const image of images) {
            if (image && image.image && offCanvasCtx && typeof offCanvasCtx.drawImage === 'function') {
                try {
                    if (asyncRender && typeof self.createImageBitmap === 'function' && image.image instanceof ArrayBuffer) {
                        bitmap = bitmap || await self.createImageBitmap(new Blob([image.image], { type: 'image/webp' }))
                        offCanvasCtx.drawImage(bitmap, image.x, image.y)
                        if (typeof bitmap.close === 'function') {
                            bitmap.close()
                        }
                        bitmap = null
                    } else {
                        offCanvasCtx.drawImage(image.image, image.x, image.y)
                        if (typeof image.image.close === 'function') {
                            image.image.close()
                        }
                    }
                    drewSomething = true
                } catch (e) {
                    console.error(`paintImages ${e}`)
                }
            }
        }

        if (offscreenRender === 'hybrid') {
            if (!drewSomething) {
                return self.postMessage({ target: 'unbusy' })
            }
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
            const buf = cache.get(tMs) || null
            if (!buf) {
                await paintImages({ images, buffers, times })
            } else {
                images.push({ w: self.width, h: self.height, x: 0, y: 0, image: buf })
                buffers.push(buf)
                lastRenderedTMs = tMs
                await paintImages({ images, buffers, times })
            }
        } catch (e) {
            console.error('render pain', e)
            self.postMessage({ target: 'unbusy' })
        }
    } else {
        self.postMessage({ target: 'unbusy' })
    }
}

const setTrack = async content => {
    cache.clear()
    lastCurrentTime = 0
    lastRenderedTMs = 0

    if (gcTimer) {
        clearInterval(gcTimer)
    }
    gcTimer = setInterval(gc, 2000)

    const r = await fetch(`${url}/init`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            content,
            stepMs,
            width: self.width,
            height: self.height,
            quantityMs: KEEP_AHEAD_MS,
            subName,
        })
    })
    const data = await r.json()

    for (const f of data.frames) {
        cache.set(f.t_ms, f.data ? b64ToU8(f.data) : null)
    }
    self.postMessage({ target: 'ready' })
}

const init = async data => {
    self.width = data.width
    self.height = data.height
    stepMs = Math.round(1000 / (data.fpsObjetivo || 30))
    url = data.wasmUrl
    subName = data.subUrl.split('/').filter(Boolean).pop()
    debug = data.debug

    asyncRender = typeof createImageBitmap !== 'undefined' && (data.asyncRender ?? true)

    const healtRes = await fetch(`${url}/health?subName=${subName}`)
    if (healtRes.ok) {
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

const freeTrack = () => {
    clearInterval(gcTimer)
    gcTimer = null
    cache.clear()
}

const demand = async ({ time }) => {
    lastCurrentTime = time

    const tMs = quantizeTimeMs(time * 1000)

    const stepTms = stepOffsetsSec.map(n => quantizeTimeMs(tMs + n * 1000))
    const futureTMs = quantizeTimeMs(tMs + stepMs)

    const toFetch = [tMs, futureTMs, ...stepTms]

    const promises = toFetch.map(async nextTMs => {
        if (!cache.has(nextTMs)) {
            cache.set(nextTMs, null)
            try {
                const buf = await fetchFrame(nextTMs)
                cache.set(nextTMs, buf)
            } catch (e) {
                cache.delete(nextTMs)
                console.error('deman fetch', e)
            }
        }
    })

    await promises[0]

    cache.delete(quantizeTimeMs(tMs - stepMs))
    for (const oldTMs of stepOffsetsSec.map(n => quantizeTimeMs(tMs - stepMs + n * 1000))) {
        cache.delete(oldTMs)
    }

    render(time)
}

const destroy = async () => {
    freeTrack()
    await fetch(`${url}/destroy`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subName })
    })
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
    destroy,

    getColorSpace: () => { },
}

self.onmessage = ({ data }) => {
    if (func[data.target]) {
        func[data.target](data)
    } else {
        throw new Error('Unknown event target ' + data.target)
    }
}
