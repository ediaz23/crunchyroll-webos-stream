
import 'webostvjs'
import api from '../api'
import logger from '../logger'
import utils from '../utils'
import { _LOCALHOST_SERVER_ } from '../const'
import { serviceURL, makeResponseHandle } from './customFetch'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

const fontNames = [
    'Lato-Bold.ttf',
    'Lato-Regular.ttf',
    'RobotoMono-Regular.ttf',
    'CourierPrime-Regular.ttf',
    'Gupter-Regular.ttf',
    'Satisfy-Regular.ttf',
]

/**
 * @typedef FontEntry
 * @type {Object}
 * @property {String} name
 * @property {String} url
 * @property {String} [etag]
 * @property {String} [lastModified]
 * @property {String} [contentType]
 * @property {String} [contentLength]
 *
 * @type {Object.<String, FontEntry>}
 */
export const availableFonts = {}


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
    const decode = false
    const { onSuccess, onFailure, onProgress, prom } = makeResponseHandle({ config: {}, decode })
    const method = 'fonts'
    if (utils.isTv()) {
        webOS.service.request(serviceURL, {
            method,
            parameters,
            onSuccess,
            onFailure,
        })
    } else {
        onProgress(`${_LOCALHOST_SERVER_}/${method}`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(parameters),
            noDecode: !decode,
        }).then(onSuccess).catch(onFailure)
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
    const res = await api.utils.fetchAuth(url, { method: 'HEAD' }, { cache: false })
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
    Object.assign(availableFonts, Object.fromEntries(fonts.map(f => [f.name, f])))
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

    const reqHeaders = {}
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
        const resSave = await makeRequest({ type: 'upsert', entry: payload, data: fontData })
        /** @type {{fonts: Array<FontEntry>}} */
        const { fonts } = await resSave.json()
        payload.url = fonts[0].url
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
}
