
import 'webostvjs'
import api from '../api'
import logger from '../logger'
import utils from '../utils'
import { _LOCALHOST_SERVER_ } from '../const'
import { serviceURL, makeResponseHandle } from './customFetch'

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
        makeRequest({ type: 'get_detail', entry })
            .then(res => res.json())
            .then(async ({ fonts }) => ({
                name: entry.name,
                data: await utils.base64toArrayAsync(fonts[0].data)
            }))
            .catch(err => {
                logger.error('error getting fonts', err)
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
 * @param {Object} parameters
 * @return {Promise<Response>}
 */
async function makeRequest(parameters) {
    const { onSuccess, onFailure, onProgress, prom } = makeResponseHandle({ config: {}, decode: false })
    const method = 'fonts'
    if (utils.isTv()) {
        webOS.service.request(serviceURL, {
            method,
            parameters,
            onSuccess,
            onFailure,
        })
    } else {
        window.fetch(`${_LOCALHOST_SERVER_}/${method}`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(parameters),
        }).then(onProgress).then(onSuccess).catch(onFailure)
    }
    return prom
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
    /** @type {Response} */
    const res = await makeRequest({ type: 'get' })
    /** @type {{fonts: Array<FontEntry>}} */
    const { fonts } = await res.json()

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
        const buf = await res.arrayBuffer()
        const fontData = utils.arrayToBase64(buf)
        await makeRequest({ type: 'upsert', entry: payload, data: fontData })
        logger.debug(`fonts saveFont ${name} save`)
    } else {
        await deleteFont(name)
        logger.debug(`fonts saveFont ${name} delete`)
    }
    logger.debug(`fonts saveFont out ${name}`)
    return payload
}

/**
 * @param {String} name
 * @returns {Promise}
 */
async function deleteFont(name) {
    logger.debug(`fonts deleteFont in ${name}`)
    await makeRequest({ type: 'delete', entry: { name } })
    logger.debug(`fonts deleteFont in ${name}`)
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
            await deleteFont(name)
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
