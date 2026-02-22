/* global Worker ResizeObserver Image createImageBitmap  */

import 'rvfc-legacy-polyfill'

let EventTargetBase = EventTarget
// #if process.env.JAS_TARGER === 'legacy'
import { EventTarget as EventTargetShim } from 'event-target-shim'
EventTargetBase = EventTargetShim
// #endif

/**
 * Remote subtitles renderer (WebP frames) using a local Worker + RVFC time source.
 * Minimal API: setNewContext(), addEventListener('ready'|'error'), destroy().
 */
export default class SubRemote extends EventTargetBase {
    /**
     * @param {Object} options
     * @param {HTMLVideoElement} options.video
     * @param {HTMLCanvasElement=} options.canvas
     * @param {String} options.serverUrl
     * @param {String=} options.subUrl
     * @param {String=} options.subContent
     * @param {Number=} options.timeOffset
     * @param {Boolean=} options.debug
     * @param {Number=} options.prescaleFactor
     * @param {Number=} options.prescaleHeightLimit
     * @param {Number=} options.maxRenderHeight
     * @param {Number=} options.maxBytesCache
     */
    constructor(options) {
        super()

        if (!options || !options.video || !options.serverUrl) {
            throw new Error('Missing options (video/workerUrl/serverUrl required)')
        }

        this.debug = !!options.debug
        this.timeOffset = options.timeOffset || 0

        this.prescaleFactor = options.prescaleFactor || 1.0
        this.prescaleHeightLimit = options.prescaleHeightLimit || 1080
        this.maxRenderHeight = options.maxRenderHeight || 0

        this._destroyed = false
        this._video = options.video
        this._videoWidth = 0
        this._videoHeight = 0

        this._loaded = new Promise(resolve => { this._init = resolve })

        this._canvas = options.canvas
        if (this._video && !this._canvas) {
            this._canvasParent = document.createElement('div')
            this._canvasParent.className = 'SUBREMOTE'
            this._canvasParent.style.position = 'relative'
            this._canvas = this._createCanvas()
            this._video.insertAdjacentElement('afterend', this._canvasParent)
        }

        this._ctx = this._canvas.getContext('2d')
        if (!this._ctx) {
            throw new Error('Canvas rendering not supported')
        }

        this.busy = false
        this._lastDemandTime = null

        this._boundResize = this.resize.bind(this)
        this._worker = new Worker(new URL('../workers/subtitleRemote.worker.js', import.meta.url), { type: 'module' })
        this._worker.onmessage = e => this._onmessage(e)
        this._worker.onerror = e => this._error(e)

        this._worker.postMessage({
            target: 'init',
            width: this._canvas.width || 0,
            height: this._canvas.height || 0,
            wasmUrl: options.serverUrl, // reusing field name from worker code
            subUrl: options.subUrl || '',
            subContent: options.subContent || null,
            debug: this.debug,
            // the worker uses this to decide decode strategy on its side
            asyncRender: typeof createImageBitmap !== 'undefined',
            maxBytesCache: options.maxBytesCache,
        })

        // RVFC (polyfilled) time source
        this._video.requestVideoFrameCallback(this._handleRVFC.bind(this))

        // resize management
        if (this._video.videoWidth > 0) {
            this.resize()
        }
        if (typeof ResizeObserver !== 'undefined') {
            this._ro = new ResizeObserver(() => this.resize())
            this._ro.observe(this._video)
        }
    }

    _createCanvas() {
        const c = document.createElement('canvas')
        c.style.display = 'block'
        c.style.position = 'absolute'
        c.style.pointerEvents = 'none'
        this._canvasParent.appendChild(c)
        return c
    }

    /**
     * Change video and subtitle context
     * @param {Object} opts
     * @param {HTMLVideoElement=} opts.video
     * @param {String=} opts.subContent
     * @returns {Promise<void>}
     */
    async setNewContext(opts) {
        if (this._destroyed) {
            throw new Error('Instance destroyed')
        }

        const video = opts && opts.video
        const subContent = opts && opts.subContent

        if (video && video !== this._video) {
            if (this._canvasParent) {
                video.insertAdjacentElement('afterend', this._canvasParent)
            }
            if (this._ro) {
                this._ro.unobserve(this._video)
                this._ro.observe(video)
            }
            this._video = video
            this._videoWidth = 0
            this._videoHeight = 0
            this._video.requestVideoFrameCallback(this._handleRVFC.bind(this))
            this.resize()
        }

        this.busy = false
        this._lastDemandTime = null

        await this._loaded

        if (typeof subContent === 'string') {
            this.sendMessage('setTrack', subContent)
        }

        if (this._video) {
            this.sendMessage('video', {
                isPaused: this._video.paused,
                currentTime: this._video.currentTime + this.timeOffset
            })
        }
    }

    /**
     * Resize the canvas to given parameters. Auto-generated if values are ommited.
     * @param  {Number} [width=0]
     * @param  {Number} [height=0]
     * @param  {Number} [top=0]
     * @param  {Number} [left=0]
     */
    resize(width, height, top, left) {
        width = width || 0
        height = height || 0
        top = top || 0
        left = left || 0

        if ((!width || !height) && this._video) {
            const videoSize = this._getVideoPosition()
            const renderSize = this._computeCanvasSize(videoSize.width || 0, videoSize.height || 0)
            width = renderSize.width
            height = renderSize.height

            if (this._canvasParent) {
                const parentTop = this._canvasParent.getBoundingClientRect().top
                const videoTop = this._video.getBoundingClientRect().top
                top = videoSize.y - (parentTop - videoTop)
                left = videoSize.x
            }

            this._canvas.style.width = videoSize.width + 'px'
            this._canvas.style.height = videoSize.height + 'px'
        }

        this._canvas.style.top = top + 'px'
        this._canvas.style.left = left + 'px'

        this.sendMessage('canvas', {
            width: width,
            height: height,
            videoWidth: this._videoWidth || this._video.videoWidth,
            videoHeight: this._videoHeight || this._video.videoHeight,
            force: false
        })
    }

    _getVideoPosition(width, height) {
        width = width || this._video.videoWidth
        height = height || this._video.videoHeight

        const videoRatio = width / height
        const offsetWidth = this._video.offsetWidth
        const offsetHeight = this._video.offsetHeight
        const elementRatio = offsetWidth / offsetHeight

        let w = offsetWidth
        let h = offsetHeight
        if (elementRatio > videoRatio) {
            w = Math.floor(offsetHeight * videoRatio)
        } else {
            h = Math.floor(offsetWidth / videoRatio)
        }

        const x = (offsetWidth - w) / 2
        const y = (offsetHeight - h) / 2

        return { width: w, height: h, x: x, y: y }
    }

    _computeCanvasSize(width, height) {
        const scalefactor = this.prescaleFactor <= 0 ? 1.0 : this.prescaleFactor
        const ratio = window.devicePixelRatio || 1
        let out = null

        if (height <= 0 || width <= 0) {
            out = { width: 0, height: 0 }
        } else {

            const sgn = scalefactor < 1 ? -1 : 1
            let newH = height * ratio

            if (sgn * newH * scalefactor <= sgn * this.prescaleHeightLimit) {
                newH *= scalefactor
            } else if (sgn * newH < sgn * this.prescaleHeightLimit) {
                newH = this.prescaleHeightLimit
            }

            if (this.maxRenderHeight > 0 && newH > this.maxRenderHeight) {
                newH = this.maxRenderHeight
            }

            const newW = width * (newH / height)
            out = { width: newW, height: newH }
        }
        return out
    }

    _unbusy() {
        if (this._lastDemandTime) {
            this._demandRender(this._lastDemandTime)
        } else {
            this.busy = false
        }
    }

    _handleRVFC(now, meta) {
        if (this._destroyed) {
            return null
        }

        const mediaTime = meta && meta.mediaTime
        const width = meta && meta.width
        const height = meta && meta.height

        if (this.busy) {
            this._lastDemandTime = { mediaTime: mediaTime, width: width, height: height }
        } else {
            this.busy = true
            this._demandRender({ mediaTime: mediaTime, width: width, height: height })
        }

        this._video.requestVideoFrameCallback(this._handleRVFC.bind(this))
    }

    _demandRender(payload) {
        this._lastDemandTime = null

        const w = payload.width
        const h = payload.height
        if (w !== this._videoWidth || h !== this._videoHeight) {
            this._videoWidth = w
            this._videoHeight = h
            this.resize()
        }

        this.sendMessage('demand', { time: payload.mediaTime + this.timeOffset })
    }

    _render(data) {
        this._unbusy()

        const images = data.images || []
        const width = data.width || this._canvas.width
        const height = data.height || this._canvas.height
        const times = data.times || {}
        const asyncRender = !!data.asyncRender

        if (this.debug) {
            times.IPCTime = Date.now() - times.JSRenderTime
        }

        if (this._canvas.width !== width || this._canvas.height !== height) {
            this._canvas.width = width
            this._canvas.height = height
        }

        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height)

        for (let i = 0; i < images.length; i++) {
            const image = images[i]
            if (image && image.image) {
                if (image.image instanceof ArrayBuffer) {
                    if (asyncRender && typeof createImageBitmap === 'function') {
                        createImageBitmap(new Blob([image.image], { type: 'image/webp' })).then(bmp => {
                            try {
                                this._ctx.drawImage(bmp, image.x, image.y)
                            } finally {
                                if (bmp && typeof bmp.close === 'function') {
                                    bmp.close()
                                }
                            }
                        }).catch(() => { })
                    } else {
                        const blobUrl = URL.createObjectURL(new Blob([image.image], { type: 'image/webp' }))
                        const img = new Image()
                        img.onload = () => {
                            try {
                                this._ctx.drawImage(img, image.x, image.y)
                            } finally {
                                URL.revokeObjectURL(blobUrl)
                            }
                        }
                        img.onerror = () => {
                            URL.revokeObjectURL(blobUrl)
                        }
                        img.src = blobUrl
                    }
                } else {
                    // ImageBitmap path (e.g. hybrid worker)
                    this._ctx.drawImage(image.image, image.x, image.y)
                    if (typeof image.image.close === 'function') {
                        image.image.close()
                    }
                }
            }
        }

        if (this.debug) {
            times.JSRenderTime = Date.now() - times.JSRenderTime - times.IPCTime
            let total = 0
            const count = times.bitmaps || images.length
            delete times.bitmaps
            for (const k in times) {
                total += times[k]
            }
            console.log('Bitmaps: ' + count + ' Total: ' + (total | 0) + 'ms', times)
        }
    }

    _ready() {
        this._init()
        this.dispatchEvent(new CustomEvent('ready'))
    }

    async sendMessage(target, data, transferable) {
        await this._loaded
        data = data || {}
        if (transferable && transferable.length) {
            this._worker.postMessage({ target: target, transferable: transferable, ...data }, transferable)
        } else {
            this._worker.postMessage({ target: target, ...data })
        }
    }

    _onmessage(e) {
        const data = e && e.data
        if (data && data.target) {
            const fn = this['_' + data.target]
            if (typeof fn === 'function') {
                fn.call(this, data)
            }
        }
    }

    _error(err) {
        const error = err instanceof Error ? err : new Error(err && err.message ? err.message : String(err))
        const event = new ErrorEvent('error', { error: error })
        this.dispatchEvent(event)
        console.error(error)
        return error
    }

    destroy() {
        if (this._destroyed) {
            return
        }

        this._destroyed = true

        if (this._ro) {
            this._ro.unobserve(this._video)
        }

        if (this._video && this._canvasParent && this._video.parentNode) {
            this._video.parentNode.removeChild(this._canvasParent)
        }

        try {
            this.sendMessage('destroy')
        } catch (e) {
            // nothing
        }

        if (this._worker) {
            this._worker.terminate()
        }
    }
}