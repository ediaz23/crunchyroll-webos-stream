
import 'webostvjs'
import LibAss from 'libass-webos-legacy'

import { customFetch } from './customFetch'
import { getFonts } from './fonts'
import logger from '../logger'
import utils from '../utils'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

/** @type {LibAss} */
let libassObj = null
const LibassWorker = new URL('libass-webos-legacy/modern/libass.worker.min.js', import.meta.url)
const LibassWorkerWasm = new URL('libass-webos-legacy/modern/worker.min.wasm', import.meta.url)

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
 * @param {Number} obj.playResY Vertical resolution declared by the .ass track.
 * @param {Number} obj.screenHeight Physical screen height in pixels.
 * @param {Boolean} obj.scaledBorder Whether the track has ScaledBorderAndShadow enabled.
 * @param {import('libass-webos-legacy').ASSStyle} obj.style
 * @returns {Number}
 */
function adjustOutline({ playResY, screenHeight, scaledBorder, style }) {
    // When the track has ScaledBorderAndShadow=yes libass renders the outline
    // as `value × (renderH / playResY)` pixels. When it doesn't, libass uses
    // the value as raw pixels. To normalize both cases, multiply the input
    // outline (and cap) by (screenHeight / playResY) in the unscaled case so
    // the on-screen thickness ends up equivalent.
    const scale = scaledBorder ? 1 : (screenHeight / playResY)
    const cur = (style.Outline || 0) * scale
    const targetPct = utils.isTv() ? 0.003 : 0.0015
    const target = targetPct * (scaledBorder ? playResY : screenHeight)
    const fs = Number(style.FontSize) || 48
    const cap = Math.max(3, Math.round(fs * 0.18 * scale))
    return Math.min(cap, Math.max(cur, target))
}

/**
 * @param {String} subContent
 * @returns {Promise<void>}
 */
const applyStyleOverrides = async (subContent) => {
    let styles = null
    try {
        const res = await libassObj.getStyles()
        styles = res.styles
    } catch (error) {
        logger.error('libass get styles')
        logger.error(error)
    }

    if (styles) {
        const playResMatch = subContent && subContent.match(/PlayResY:\s*(\d+)/i)
        const playResY = playResMatch ? parseInt(playResMatch[1], 10) : 1080
        const scaledBorder = !!subContent && /^ScaledBorderAndShadow:\s*yes/im.test(subContent)
        const screenHeight = utils.isTv()
            ? await new Promise(res => webOS.deviceInfo(info => res(info.screenHeight)))
            : (typeof window !== 'undefined' && window.screen ? window.screen.height : 1080)

        for (let i = 0; i < styles.length; i++) {
            const st = styles[i]
            await libassObj.setStyle(i, {
                ...st,
                Outline: adjustOutline({ playResY, screenHeight, scaledBorder, style: st }),
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
        })

        fonts.data = null
        fonts.names = null
        fonts.promise = null
        fonts.ready = false
    }

    await applyStyleOverrides(subContent)
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
