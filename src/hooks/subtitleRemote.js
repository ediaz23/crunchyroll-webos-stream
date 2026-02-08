
import Jassub from 'jassub-webos5'

import { customFetch } from './customFetch'
//import { getFonts } from './fonts'
//import logger from '../logger'
//import utils from '../utils'


export class JassubRemote extends Jassub {
    constructor(options) {
        super(options)
    }

    _render({ images, asyncRender, times, width, height, colorSpace }) {
        if (this.debug) {
            times.IPCTime = Date.now() - times.JSRenderTime
        }

        if (this._canvasctrl.width !== width || this._canvasctrl.height !== height) {
            this._canvasctrl.width = width
            this._canvasctrl.height = height
            this._verifyColorSpace({ subtitleColorSpace: colorSpace })
        }

        this._ctx.clearRect(0, 0, this._canvasctrl.width, this._canvasctrl.height)

        for (const image of images) {
            if (!image.image) continue

            // Remote: worker puede mandar WebP como ArrayBuffer
            if (image.image instanceof ArrayBuffer) {
                if (typeof window.createImageBitmap !== 'undefined') {
                    window.createImageBitmap(new Blob([image.image], { type: 'image/webp' })).then(bmp => {
                        try {
                            this._ctx.drawImage(bmp, image.x, image.y)
                        } finally {
                            if (bmp.close) {
                                bmp.close()
                            }
                        }
                    })
                } else {
                    const blobUrl = URL.createObjectURL(new Blob([image.image], { type: 'image/webp' }))
                    const img = new window.Image()
                    img.onload = () => {
                        try {
                            this._ctx.drawImage(img, image.x, image.y)
                        } finally {
                            URL.revokeObjectURL(blobUrl)
                        }
                    }
                    img.onerror = () => URL.revokeObjectURL(blobUrl)
                    img.src = blobUrl
                }
                continue
            }

            // JASSUB original
            if (asyncRender) {
                this._ctx.drawImage(image.image, image.x, image.y)
                image.image.close()
            } else {
                this._bufferCanvas.width = image.w
                this._bufferCanvas.height = image.h
                this._bufferCtx.putImageData(
                    new window.ImageData(this._fixAlpha(new Uint8ClampedArray(image.image)), image.w, image.h),
                    0,
                    0
                )
                this._ctx.drawImage(this._bufferCanvas, image.x, image.y)
            }
        }

        if (this.debug) {
            times.JSRenderTime = Date.now() - times.JSRenderTime - times.IPCTime
            let total = 0
            const count = times.bitmaps || images.length
            delete times.bitmaps
            for (const key in times) total += times[key]
            console.log('Bitmaps: ' + count + ' Total: ' + (total | 0) + 'ms', times)
        }
    }
}

const SubtitleRemoteWorker = new URL('../workers/subtitleRemote.worker.js', import.meta.url)

/** @type {JassubRemote} */
let jassubObj = null

/**
 * create or reuse sub worker
 * @param {HTMLVideoElement} video
 * @param {String} subUrl
 */
export const createSubRemoteWorker = async (video, subUrl) => {
    let resolve, reject
    const prom = new Promise((res, rej) => { resolve = res; reject = rej })
    const subRes = await customFetch(subUrl)
    const subContent = await subRes.text()
    if (jassubObj) {
        jassubObj.setNewContext({ video, subContent }).then(resolve).catch(reject)
    } else {
        //        const { libassMemoryLimit, libassGlyphLimit } = await getMemoryLimits()
        //        const fonts = await getFonts()
        jassubObj = new JassubRemote({
            video,
            subUrl,
            subContent,
            //            fonts: fonts.data,
            //            fallbackFont: fonts.defaultFont,
            workerUrl: SubtitleRemoteWorker.href,
            modernWasmUrl: 'http://192.168.0.7:19090',
            wasmUrl: 'http://192.168.0.7:19090',
        })
        jassubObj.addEventListener('ready', resolve, { once: true })
        jassubObj.addEventListener('error', reject, { once: true })
        prom.then(() => {
            // free memory
            //            fonts.data = null
            //            fonts.names = null
            //            fonts.promise = null
            //            fonts.ready = false
        })
    }
    return prom
}

/**
 * Destroy current sub worker
 */
export const destroySubRemoteWorker = () => {
    jassubObj?.destroy()
    jassubObj = null
}
