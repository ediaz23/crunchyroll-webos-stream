/* global Worker */

import { useEffect, useCallback, useState } from 'react'
import * as fetchUtils from './customFetch'
import logger from '../logger'


/**
 * Download file per chunkSize
 * @param {String} url
 * @param {Number} chunkSize
 * @returns {Promise<Array<{start: Number, end: Number, reqConfig: RequestInit}>>}
 */
const downloadBifFile = async (url, chunkSize, buffer, totalSize) => {
    logger.debug(`preview in chunkSize ${chunkSize} ${url}`)
    /** @type {Array<{start: Number, end: Number, reqConfig: RequestInit | { buff: Uint8Array }}>} */
    const requests = []

    const firstEnd = Math.min(chunkSize - 1, totalSize - 1)
    requests.push({ start: 0, end: firstEnd, reqConfig: { buff: new Uint8Array(buffer) } })

    for (let start = chunkSize; start < totalSize; start += chunkSize) {
        const end = Math.min(start + chunkSize - 1, totalSize - 1)
        const reqConfig = { headers: { Range: `bytes=${start}-${end}` } }
        requests.push({ start, end, reqConfig })
    }

    logger.debug(`preview out requests ${requests.length} ${url}`)
    return requests
}
/**
 * Calculate bif chunk size optimized for fewer requests and lower CPU
 * @param {Number} kbps
 * @return {Number}
 */
const calculateChunkSize = (kbps) => {
    let chunkSize = 384
    try {
        const kbPerSec = kbps / 8
        if (kbPerSec > 2000) {
            chunkSize = 768
        } else if (kbPerSec > 1500) {
            chunkSize = 640
        } else if (kbPerSec > 1000) {
            chunkSize = 512
        } else if (kbPerSec > 500) {
            chunkSize = 384
        } else {
            chunkSize = 256
        }
    } catch (_e) {
        // ignore
    }
    return chunkSize
}

/**
 * @callback FindPreviewsCallBack
 * @param {Object} obj
 * @param {String} obj.bif
 * @param {Number} kbps
 * @returns {Promise<{chunks: Array<{start: Number, end: Number, slice: Uint8Array}>}>}
 */

/**
 * @param {Boolean} active
 * @returns {FindPreviewsCallBack}
 */
export function usePreviewWorker(active) {
    /** @type {[Worker, Function]} */
    const [worker, setWorker] = useState(null)

    /**
     * @type {FindPreviewsCallBack}
     */
    const findPreviews = useCallback(async ({ bif }, kbps) => {
        /** @type {{chunks: Array<{start: Number, end: Number, slice: Uint8Array}>}} */
        let out = { chunks: [] }
        if (bif && worker) {
            let chunkIndex = 0, res
            const chunkSize = calculateChunkSize(kbps) << 10  // kb -> bytes * 1024
            const delayMs = Math.min(2000, chunkSize >> 9)  // chunk (original) * 2
            logger.debug(`preview chunkSize ${chunkSize} delayMs ${delayMs}`)
            /** @type {Response} */
            const firstChunkResponse = await fetchUtils.customFetch(
                bif,
                { headers: { Range: `bytes=0-${chunkSize - 1}` } },
                { cache: false }
            )
            const contentRange = firstChunkResponse.headers.get('Content-Range')
            const totalSize = contentRange ? parseInt(contentRange.split('/')[1]) : null

            const buffer = await firstChunkResponse.arrayBuffer()
            const imageCount = new DataView(buffer).getUint32(12, true)
            const hasImageCount = 0 < imageCount && imageCount < 100000
            logger.debug(`preview imageCount ${imageCount}`)
            const prom = new Promise(resolve => { res = resolve })
            out.chunks = hasImageCount ? Array.from({ length: imageCount }) : []
            /** @param {{data: {slices: Array<{start: Number, end: Number, slice: Uint8Array, last: Boolean}>}}} */
            worker.onmessage = ({ data }) => {
                let finish = false
                data.slices.forEach(({ start, end, slice, last }) => {
                    if (hasImageCount) {
                        out.chunks[chunkIndex++] = { start, end, slice }
                    } else {
                        out.chunks.push({ start, end, slice })
                    }
                    finish |= last
                })
                if (finish) {
                    logger.debug(`preview finish ${chunkIndex}`)
                    worker.terminate()
                    if (!hasImageCount) {
                        res()
                    }
                }
            }

            downloadBifFile(bif, chunkSize, buffer, totalSize).then(async requests => {
                for (const { start, end, reqConfig } of requests) {
                    await new Promise(r => setTimeout(r, delayMs))
                    logger.debug(`preview downloadBifFile ${start} ${end}`)
                    const chunk = (reqConfig.buff
                        ? reqConfig.buff
                        : await fetchUtils.customFetch(bif, reqConfig, { direct: true, cache: false })
                    )
                    const last = end === requests[requests.length - 1].end
                    if (!worker.finished) {
                        worker.postMessage({ type: 'append', chunk, start, last, }, [chunk.buffer])
                    } else {
                        if (!hasImageCount) {
                            res()
                        }
                        break;
                    }
                }
            })

            if (hasImageCount) {
                res()
            }
            await prom
        }
        return out
    }, [worker])

    useEffect(() => {
        if (active) {
            setWorker(new Worker(new URL('../workers/bif.worker.js', import.meta.url), { type: 'module' }))
        }
        return () => {
            setWorker(oldWorker => {
                if (oldWorker) {
                    oldWorker.finished = true
                    oldWorker.terminate()
                }
                return null
            })
        }
    }, [active])

    return findPreviews
}
