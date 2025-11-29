
import 'webostvjs'
import Jassub from 'jassub-webos5/legacy'
import Dexie from 'dexie/dist/dexie'
import api from '../api'
import logger from '../logger'
import utils from '../utils'
import { customFetch } from './customFetch'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

const fontNames = [
    // 'Lato-Hairline.ttf',  too many
    // 'Lato-Thin.ttf',  too many
    'Lato-Light.ttf',
    'Lato-Medium.ttf',
    'Lato-Regular.ttf',
    'Lato-Semibold.ttf',
    'Lato-Bold.ttf',
    'Lato-Black.ttf',
    'Lato-Heavy.ttf',
    'RobotoMono-Regular.ttf',
    // 'CourierPrime-Regular.ttf', monospace keep roboto
    'Gupter-Regular.ttf',
    'Satisfy-Regular.ttf',
]

const liteFontNames = [
    'lato-regular.ttf',
    'lato-bold.ttf',
    'lato-black.ttf',
    'robotomono-regular.ttf'
]

/**
 * @typedef FontEntry
 * @type {Object}
 * @property {String} name
 * @property {String} [etag]
 * @property {String} [lastModified]
 * @property {String} [contentType]
 * @property {String} [contentLength]
 */

/**
 * @type {Object.<string, FontEntry>}
 */
const availableFonts = {};

const fontsData = {
    /** @type {Boolean} */
    ready: false,
    /** @type {Array<String>} */
    names: null,
    /** @type {Array<Uint8Array>} */
    data: null,
    /** @type {Promise} */
    promise: null,
    /** @type {String} */
    defaultFont: null,
}

const defaultFont = new URL('jassub-webos5/default-font', import.meta.url)

/**
 * @returns {Promise}
 */
const loadFonts = async () => {
    fontsData.ready = false
    fontsData.names = []
    fontsData.data = []

    let isFontValid = () => true

    if (utils.isTv()) {
        const deviceInfo = await new Promise(res => webOS.deviceInfo(res))
        const ramInGB = utils.parseRamSizeInGB(deviceInfo.ddrSize || '1G')
        if (ramInGB <= 0.8) {
            isFontValid = entry => liteFontNames.includes(entry.name)
        }
    }
    const proms = Object.values(availableFonts).filter(isFontValid).map(entry =>
        crudFonts({ type: 'get_detail', entry })
            .then(res => (new window.Response(res.data)).arrayBuffer())
            .then(font => ({ name: entry.name, data: new Uint8Array(font) }))
            .catch(err => {
                logger.error('error getting fonts')
                logger.error(err)
                return null
            })
    )
    proms.push(
        (utils.isTv()
            ? utils.loadData(defaultFont.href, true)
            : fetch(defaultFont.href).then(r => r.arrayBuffer())
        ).then(ab => ({ name: 'liberation sans', data: new Uint8Array(ab) }))
    )
    await Promise.all(proms).then(fonts => fonts.filter(f => !!f)).then(fonts => {
        fonts.sort((a, b) => a.name.localeCompare(b.name))
        for (const font of fonts) {
            fontsData.data.push(font.data)
            fontsData.names.push(font.name)
        }
    })
    fontsData.defaultFont = fontsData.names.includes('lato-regular.ttf') ? 'lato' : fontsData.defaultFont
    fontsData.ready = true
}

export const getFonts = async () => {
    if (!fontsData.ready) {
        if (!fontsData.promise) {
            fontsData.promise = loadFonts()
        }
        await fontsData.promise
    }
    return fontsData
}

/** @type {import('jassub-webos5').default} */
let jassubObj = null
const JassubWorker = new URL('jassub-webos5/legacy/jassub.worker.min.js', import.meta.url)
const JassubWorkerWasm = new URL('jassub-webos5/legacy/worker.min.js', import.meta.url)

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
export const createSubWorker = async (video, subUrl) => {
    let resolve, reject
    const prom = new Promise((res, rej) => { resolve = res; reject = rej })
    const subRes = await customFetch(subUrl)
    const decoder = new window.TextDecoder('utf-8', { fatal: false })
    const subContent = decoder.decode(new Uint8Array(await subRes.arrayBuffer()))
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
            blendMode: 'js',
            workerUrl: JassubWorker.href,
            legacyWasmUrl: JassubWorkerWasm.href,
            dropAllBlur: true,
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
export const destroySubWorker = () => {
    jassubObj?.destroy()
    jassubObj = null
}

/**
 * @param {Response} res
 * @returns {FontEntry}
 */
function getHeadInfo(res) {
    return {
        etag: res.headers.get('etag'),
        lastModified: res.headers.get('last-modified'),
        contentLength: res.headers.get('content-length'),
        contentType: res.headers.get('content-type')
    }
}

/**
 * @type {String} url
 * @return {Promise<FontEntry>}
 */
async function fetchRemoteHeaders(url) {
    logger.debug(`fonts fetchRemoteHeaders in ${url}`)
    await new Promise(wait => setTimeout(wait, 200))
    const headers = {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0'
    }
    const res = await api.utils.fetchAuth(url, { method: 'HEAD', headers }, { cache: false })
    let out = null
    if (res.ok) {
        out = getHeadInfo(res)
    }
    logger.debug(`fonts fetchRemoteHeaders out ${url}`)
    return out
}

export async function requestCachedFonts() {
    logger.debug(`fonts requestCachedFonts in`)
    /** @type {{fonts: Array<FontEntry>}} */
    const { fonts } = await crudFonts({ type: 'get' })

    for (const font of fonts) {
        availableFonts[font.name] = font
    }
    logger.debug(`fonts fonst ${JSON.stringify(availableFonts)}`)
    logger.debug(`fonts requestCachedFonts out`)
}

/**
 * @param {String} url
 * @param {String} name
 * @param {Object} headers
 * @param {FontEntry} cached
 * @return {Promise<FontEntry|null>}
 */
async function saveFont(url, name, headers, cached) {
    logger.debug(`fonts saveFont in ${name}`)
    await new Promise(wait => setTimeout(wait, 200))

    const reqHeaders = {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0'
    }
    if (headers?.etag) {
        reqHeaders['If-None-Match'] = headers.etag
    }
    if (headers?.lastModified) {
        reqHeaders['If-Modified-Since'] = headers.lastModified
    }

    const res = await api.utils.fetchAuth(url, { headers: reqHeaders }, { cache: false })
    let payload = null

    if (res.status === 304) {
        payload = cached
        logger.debug(`fonts saveFont ${name} on cache`)
    } else if (res.ok) {
        payload = { name, ...getHeadInfo(res) }
        await crudFonts({ type: 'upsert', entry: payload, data: await res.blob() })
        logger.debug(`fonts saveFont ${name} save`)
    } else {
        await crudFonts({ type: 'delete', entry: { name } })
        logger.debug(`fonts saveFont ${name} delete`)
    }
    logger.debug(`fonts saveFont out ${name}`)
    return payload
}

/**
 * @param {Object} obj
 * @param {'get'|'get_detail'|'upsert'|'delete'} obj.type
 * @param {FontEntry} obj.entry
 * @param {Blob} [obj.data]
 * @return {Promise<{fonts: Array<FontEntry>, data: Blob}>}
 */
async function crudFonts({ type, entry, data }) {
    logger.debug(`fonts crudFonts in ${type}`)
    const out = { fonts: [], data: null }

    try {
        const db = new Dexie('fontsDB')

        db.version(1).stores({ fonts_meta: 'name', fonts_data: '' })

        if (type === 'get') {
            out.fonts = await db.fonts_meta.toArray()
        } else if (type === 'get_detail') {
            out.data = await db.fonts_data.get(entry.name)
        } else if (type === 'upsert') {
            await db.fonts_data.put(data, entry.name)
            await db.fonts_meta.put(entry)
        } else if (type === 'delete') {
            await db.fonts_meta.delete(entry.name)
            await db.fonts_data.delete(entry.name)
        } else {
            throw new Error('type not defined')
        }

        db.close()
    } catch (err) {
        logger.error('Error handle fonts')
        logger.error(err)
    }
    logger.debug(`fonts crudFonts out ${type}`)
    return out
}


export async function syncFonts() {
    await requestCachedFonts()
    const links = fontNames.map(name => ({
        link: `https://www.crunchyroll.com/webos/fonts/${name}`,
        name: name.toLowerCase()
    }))
    const processed = new Set()

    for (const { link, name } of links) {
        const cached = availableFonts[name]
        processed.add(name)

        if (cached) {
            const hearders = await fetchRemoteHeaders(link)
            if (hearders) {
                const etagChanged = (
                    hearders.etag &&
                    cached.etag &&
                    hearders.etag !== cached.etag
                )
                const modChanged = (
                    hearders.lastModified &&
                    cached.lastModified &&
                    new Date(hearders.lastModified).getTime() !== new Date(cached.lastModified).getTime()
                )
                const sizeChanged = (
                    hearders.contentLength &&
                    cached.contentLength &&
                    parseInt(hearders.contentLength) !== parseInt(cached.contentLength)
                )
                if (etagChanged || modChanged || sizeChanged) {
                    availableFonts[name] = await saveFont(link, name, hearders, cached)
                }
            } else {
                availableFonts[name] = await saveFont(link, name, hearders, cached)
            }
        } else {
            availableFonts[name] = await saveFont(link, name, null, null)
        }
    }

    for (const name in availableFonts) {
        if (!processed.has(name)) {
            await crudFonts({ type: 'delete', entry: { name } })
            availableFonts[name] = null
        }
    }

    for (const name in availableFonts) {
        if (!availableFonts[name]) {
            delete availableFonts[name]
        }
    }
    if (fontsData.promise) {
        await fontsData.promise
    }
    fontsData.ready = false
    fontsData.promise = null
    await getFonts()
}
