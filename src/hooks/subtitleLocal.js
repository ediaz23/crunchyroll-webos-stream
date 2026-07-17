
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
    // libassMemoryLimit: bitmap cache in MB (libass default: 500).
    // libassGlyphLimit:  glyph cache count  (libass default: 1000).
    let libassMemoryLimit = 24, libassGlyphLimit = 2000

    if (utils.isTv()) {
        const deviceInfo = await new Promise(res => webOS.deviceInfo(res))
        const ramInGB = utils.parseRamSizeInGB(deviceInfo.ddrSize || '1G')

        if (ramInGB <= 0.8) {
            libassMemoryLimit = 8
            libassGlyphLimit = 500
        }
    }

    return { libassMemoryLimit, libassGlyphLimit }
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
        const { libassMemoryLimit, libassGlyphLimit } = await getMemoryLimits()
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
