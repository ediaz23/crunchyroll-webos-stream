
import 'webostvjs'
import Jassub from 'jassub-webos5'

import { customFetch } from './customFetch'
import { getFonts } from './fonts'
import logger from '../logger'
import utils from '../utils'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

/** @type {import('jassub-webos5').default} */
let jassubObj = null
const JassubWorker = new URL('jassub-webos5/modern/jassub.worker.min.js', import.meta.url)
const JassubWorkerWasm = new URL('jassub-webos5/modern/worker.min.wasm', import.meta.url)

const getMemoryLimits = async () => {
    let libassMemoryLimit = 24, libassGlyphLimit = 2

    if (utils.isTv()) {
        const deviceInfo = await new Promise(res => webOS.deviceInfo(res))
        const ramInGB = utils.parseRamSizeInGB(deviceInfo.ddrSize || '1G')

        if (ramInGB <= 0.8) {
            libassMemoryLimit = 8
            libassGlyphLimit = 1
        }
    }

    return { libassMemoryLimit, libassGlyphLimit }
}

/**
 * @param {Object} obj
 * @param {Number} obj.screenHeight
 * @param {import('jassub-webos5').ASS_Style} obj.style
 * @returns {Number}
 */
function adjustOutline({ screenHeight, style }) {
    let out = style.Outline
    if ((style.Outline || 0) <= 3) {
        const base = Math.max((style.Outline || 0), 1)
        const factor0 = screenHeight / (2160 / 10)
        const atten = 1 / (1 + (style.Outline || 0))
        out = Math.round(base * (factor0 * atten))
    }
    return out
}

/**
 * create or reuse sub worker
 * @param {HTMLVideoElement} video
 * @param {String} subUrl
 */
export const createSubLocalWorker = async (video, subUrl) => {
    let resolve, reject
    const prom = new Promise((res, rej) => { resolve = res; reject = rej })
    const subRes = await customFetch(subUrl)
    const subContent = await subRes.text()
    if (jassubObj) {
        jassubObj.setNewContext({ video, subContent }).then(resolve).catch(reject)
    } else {
        const { libassMemoryLimit, libassGlyphLimit } = await getMemoryLimits()
        const fonts = await getFonts()
        jassubObj = new Jassub({
            video,
            subContent,
            fonts: fonts.data,
            fallbackFont: fonts.defaultFont,
            timeOffset: 0.2,
            libassMemoryLimit,
            libassGlyphLimit,
            blendMode: 'wasm',
            workerUrl: JassubWorker.href,
            wasmUrl: JassubWorkerWasm.href,
        })
        jassubObj.addEventListener('ready', resolve, { once: true })
        jassubObj.addEventListener('error', reject, { once: true })
        prom.then(() => {
            // free memory
            fonts.data = null
            fonts.names = null
            fonts.promise = null
            fonts.ready = false
        })
    }
    return prom.then(() => new Promise(res => {
        if (jassubObj) {
            jassubObj.getStyles((error, styles) => {
                if (error) {
                    logger.error('jassub get styles')
                    logger.error(error)
                }
                if (!error) {
                    const setOutline = info => {
                        styles.forEach((st, i) => {
                            jassubObj.setStyle({
                                ...st,
                                Outline: adjustOutline({ screenHeight: info.screenHeight, style: st }),
                                BorderStyle: 1,
                                OutlineColour: 0x000000
                            }, i)
                        })
                        res()
                    }
                    if (utils.isTv()) {
                        webOS.deviceInfo(setOutline)
                    } else {
                        setOutline({ screenHeight: 2160 })
                    }
                } else {
                    res()
                }
            })
        } else {
            res()
        }
    }))
}

/**
 * Destroy current sub worker
 */
export const destroySubLocalWorker = () => {
    jassubObj?.destroy()
    jassubObj = null
}
