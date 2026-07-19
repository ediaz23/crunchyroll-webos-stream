
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

// Context captured on load so runtime scale changes can recompute from the
// original track values instead of compounding on previously-scaled ones.
let styleCtx = null
// Latest applied settings — merged with partial updates so the caller can
// change one field without having to resend the others.
let currentSettings = { fontScale: 100, outlineScale: 100, timeOffset: 0 }

const getMemoryLimits = async () => {
    // libassMemoryLimit: libass bitmap cache in MB (libass default: 500).
    // libassGlyphLimit:  libass glyph cache count  (libass default: 1000).
    // renderCacheBytes:  main-thread LRU of ImageBitmap (JS heap).
    // Non-TV (desktop): assume plenty of RAM.
    let libassMemoryLimit = 24, libassGlyphLimit = 3000, renderCacheBytes = 40 * 1024 * 1024

    if (utils.isTv()) {
        /** @type {import('webostvjs').DeviceInfo} */
        const deviceInfo = await new Promise(res => webOS.deviceInfo(res))
        const ramInGB = utils.parseRamSizeInGB(deviceInfo.ddrSize || '1G')
        const is4K = deviceInfo.screenWidth >= 3840 && deviceInfo.screenHeight >= 2160
        const hasHDR = !!(deviceInfo.hdr10 || deviceInfo.dolbyVision)
        // 4K weighs more than RAM: a 4K panel means a modern SoC even on 1GB
        // TVs, and the render pipeline scales more with GPU than with heap.
        const score = (ramInGB * 2) + (is4K ? 2 : 0) + (hasHDR ? 1 : 0)

        if (score >= 6) {
            // Gama alta
            libassMemoryLimit = 24
            libassGlyphLimit = 3000
            renderCacheBytes = 40 * 1024 * 1024
        } else if (score >= 5) {
            // Gama media-alta
            libassMemoryLimit = 20
            libassGlyphLimit = 2500
            renderCacheBytes = 24 * 1024 * 1024
        } else if (score >= 3.5) {
            // Gama media
            libassMemoryLimit = 16
            libassGlyphLimit = 2000
            renderCacheBytes = 20 * 1024 * 1024
        } else {
            // Gama baja
            libassMemoryLimit = 8
            libassGlyphLimit = 1000
            renderCacheBytes = 14 * 1024 * 1024
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
 * Apply scale multipliers to the captured original styles and push them to
 * libass. Called both on initial load and whenever the user changes the
 * scale pickers. Percentages, not multipliers (100 = 1.0×).
 * @param {Object} obj
 * @param {Number} obj.fontScale
 * @param {Number} obj.outlineScale
 * @returns {Promise<void>}
 */
const applyStyleScales = async ({ fontScale, outlineScale }) => {
    const shouldApply = libassObj && styleCtx
    if (shouldApply) {
        const fs = fontScale / 100
        const os = outlineScale / 100
        const { originalStyles, playResY, screenHeight, scaledBorder } = styleCtx

        for (let i = 0; i < originalStyles.length; i++) {
            const st = originalStyles[i]
            const baseOutline = adjustOutline({ playResY, screenHeight, scaledBorder, style: st })
            await libassObj.setStyle(i, {
                ...st,
                FontSize: (Number(st.FontSize) || 48) * fs,
                Outline: baseOutline * os,
                BorderStyle: 1,
                OutlineColour: 0x000000,
            })
        }
    }
}

/**
 * Capture original styles + render context from the track, then apply the
 * initial scales.
 * @param {String} subContent
 * @param {Number} fontScale
 * @param {Number} outlineScale
 * @returns {Promise<void>}
 */
const applyStyleOverrides = async (subContent, fontScale, outlineScale) => {
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

        styleCtx = { originalStyles: styles, playResY, screenHeight, scaledBorder }
        await applyStyleScales({ fontScale, outlineScale })
    }
}

/**
 * create or reuse sub worker
 * @param {HTMLVideoElement} video
 * @param {String} subUrl
 * @param {Object} [settings]
 * @param {Number} [settings.fontScale] Percentage; 100 = 1.0×.
 * @param {Number} [settings.outlineScale] Percentage; 100 = 1.0×.
 * @param {Number} [settings.timeOffset] Seconds; positive advances, negative delays.
 */
export const createSubLocalWorker = async (video, subUrl, settings) => {
    currentSettings = {
        fontScale: (settings && settings.fontScale) || 100,
        outlineScale: (settings && settings.outlineScale) || 100,
        timeOffset: (settings && settings.timeOffset) || 0,
    }
    const { fontScale, outlineScale, timeOffset } = currentSettings
    const subRes = await customFetch(subUrl)
    const subContent = await subRes.text()

    if (libassObj) {
        await libassObj.setNewContext({ video, subContent })
        libassObj.timeOffset = timeOffset
    } else {
        const { libassMemoryLimit, libassGlyphLimit, renderCacheBytes } = await getMemoryLimits()
        const fonts = await getFonts()
        libassObj = new LibAss()
        await libassObj.load({
            video,
            subContent,
            fonts: fonts.data,
            fallbackFont: fonts.defaultFont,
            timeOffset,
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

    await applyStyleOverrides(subContent, fontScale, outlineScale)
    // Warm the cache so playback starts with the first cacheable subs ready.
    await libassObj.awaitNextCacheableEvents(video.currentTime || 0)
}

/**
 * Block until the next cacheable subs from `fromTime` are in the LRU (or a
 * safety timeout fires). Called by the Player on seek to avoid the "video
 * plays, subs missing" gap. No-op when hardsub / not loaded.
 * @param {Number} fromTime
 * @returns {Promise<void>}
 */
export const waitForSubsReady = async (fromTime) => {
    if (libassObj) {
        await libassObj.awaitNextCacheableEvents(fromTime)
    }
}

/**
 * Update sub settings at runtime. Any field can be omitted to keep its
 * current value. Called by the pickers during playback.
 * @param {Object} settings
 * @param {Number} [settings.fontScale]
 * @param {Number} [settings.outlineScale]
 * @param {Number} [settings.timeOffset]
 */
export const updateSubtitleSettings = async (settings) => {
    const stylesChanged = settings.fontScale !== undefined || settings.outlineScale !== undefined
    const offsetChanged = settings.timeOffset !== undefined
    currentSettings = { ...currentSettings, ...settings }
    if (libassObj) {
        if (offsetChanged) {
            libassObj.timeOffset = currentSettings.timeOffset
        }
        if (stylesChanged) {
            await applyStyleScales({
                fontScale: currentSettings.fontScale,
                outlineScale: currentSettings.outlineScale,
            })
        }
    }
}

/**
 * Destroy current sub worker
 */
export const destroySubLocalWorker = async () => {
    if (libassObj) {
        await libassObj.destroy()
        libassObj = null
    }
    styleCtx = null
    currentSettings = { fontScale: 100, outlineScale: 100, timeOffset: 0 }
}
