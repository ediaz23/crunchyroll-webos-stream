
import 'webostvjs'
import LibAss from 'libass-webos-legacy/debug'

import { customFetch } from './customFetch'
import { getFonts } from './fonts'
import logger from '../logger'
import utils from '../utils'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

/** @type {LibAss} */
let libassObj = null
const LibassWorker = new URL('libass-webos-legacy/modern/libass.worker.debug.js', import.meta.url)
const LibassWorkerWasm = new URL('libass-webos-legacy/modern/worker.debug.wasm', import.meta.url)

const getMemoryLimits = async () => {
    // libassMemoryLimit: libass bitmap cache in MB (libass default: 500).
    // libassGlyphLimit:  libass glyph cache count  (libass default: 1000).
    // renderCacheBytes:  main-thread LRU of ImageBitmap (JS heap).
    // Non-TV (desktop): assume plenty of RAM.
    let libassMemoryLimit = 24, libassGlyphLimit = 3000, renderCacheBytes = 24 * 1024 * 1024

    if (utils.isTv()) {
        /** @type {import('webostvjs').DeviceInfo} */
        const deviceInfo = await new Promise(res => webOS.deviceInfo(res))
        const ramInGB = utils.parseRamSizeInGB(deviceInfo.ddrSize || '1G')
        const is4K = deviceInfo.screenWidth >= 3840 && deviceInfo.screenHeight >= 2160
        const hasHDR = !!(deviceInfo.hdr10 || deviceInfo.dolbyVision)
        const score = (ramInGB * 2) + (is4K ? 1 : 0) + (hasHDR ? 1 : 0)

        if (score >= 6) {
            // Gama alta
            libassMemoryLimit = 24
            libassGlyphLimit = 3000
            renderCacheBytes = 24 * 1024 * 1024
        } else if (score >= 5) {
            // Gama media-alta
            libassMemoryLimit = 20
            libassGlyphLimit = 2500
            renderCacheBytes = 16 * 1024 * 1024
        } else if (score >= 3.5) {
            // Gama media
            libassMemoryLimit = 16
            libassGlyphLimit = 2000
            renderCacheBytes = 12 * 1024 * 1024
        } else {
            // Gama baja
            libassMemoryLimit = 8
            libassGlyphLimit = 1000
            renderCacheBytes = 8 * 1024 * 1024
        }
    }

    return { libassMemoryLimit, libassGlyphLimit, renderCacheBytes }
}

/**
 * @param {Object} obj
 * @param {Number} obj.screenHeight
 * @param {import('libass-webos-legacy').ASSStyle} obj.style
 * @returns {Number}
 */
function adjustOutline({ screenHeight, style }) {
    const cur = style.Outline || 0
    let out = cur

    if (cur <= 3) {
        const base = Math.max(cur, 1)
        const ratio = screenHeight / 2160
        const k = 6
        const atten = 1 / (1 + cur)

        const calc = Math.round(base * (k * ratio) * atten)

        const fs = Number(style.FontSize) || 48
        const cap = Math.max(3, Math.round(fs * 0.18))

        out = Math.min(cap, Math.max(cur, calc))
    }

    return out
}

/**
 * @returns {Promise<void>}
 */
const applyStyleOverrides = async () => {
    let styles = null
    try {
        const res = await libassObj.getStyles()
        styles = res.styles
    } catch (error) {
        logger.error('libass get styles')
        logger.error(error)
    }

    if (styles) {
        const families = [...new Set(styles.map(s => s.FontName))]
        logger.info('libass style families: ' + JSON.stringify(families))
        const loaded = await libassObj.getFontFamilies()
        logger.info('libass loaded fonts: ' + JSON.stringify(loaded.families))

        const screenHeight = utils.isTv()
            ? await new Promise(res => webOS.deviceInfo(info => res(info.screenHeight)))
            : 2160

        for (let i = 0; i < styles.length; i++) {
            const st = styles[i]
            await libassObj.setStyle(i, {
                ...st,
                Outline: adjustOutline({ screenHeight, style: st }),
                BorderStyle: 1,
                OutlineColour: 0x000000,
            })
        }
    }
}

/**
 * create or reuse sub worker
 * @param {HTMLVideoElement} video
 * @param {String} subUrl
 */
export const createSubLocalWorker = async (video, subUrl) => {
    const subRes = await customFetch(subUrl)
    const subContent = await subRes.text()

    if (libassObj) {
        await libassObj.setNewContext({ video, subContent })
    } else {
        const { libassMemoryLimit, libassGlyphLimit, renderCacheBytes } = await getMemoryLimits()
        const fonts = await getFonts()
        libassObj = new LibAss()
        await libassObj.load({
            video,
            subContent,
            fonts: fonts.data,
            fallbackFont: fonts.defaultFont,
            timeOffset: 0.2,
            libassMemoryLimit,
            libassGlyphLimit,
            maxCacheBytes: renderCacheBytes,
            workerUrl: LibassWorker.href,
            wasmUrl: LibassWorkerWasm.href,
            debug: true,
        })

        fonts.data = null
        fonts.names = null
        fonts.promise = null
        fonts.ready = false
    }

    await applyStyleOverrides()
}

/**
 * Destroy current sub worker
 */
export const destroySubLocalWorker = async () => {
    if (libassObj) {
        await libassObj.destroy()
        libassObj = null
    }
}
