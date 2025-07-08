/* global Worker */

import { useEffect, useCallback, useState } from 'react'
import * as fetchUtils from './customFetch'

const BifWorker = new URL('../workers/bif.worker.js', import.meta.url)

/**
 * Download file per chunkSize
 * @param {String} url
 * @param {Number} chunkSize
 * @returns {Promise<Array<{start: Number, end: Number, reqConfig: RequestInit}>>}
 */
const downloadBifFile = async (url, chunkSize) => {
    const headResponse = await fetchUtils.customFetch(url, { method: 'HEAD' })
    /** @type {Array<{start: Number, end: Number, getData: () => Promise<Uint8Array>}>} */
    const requests = []
    if (headResponse.ok) {
        const totalSize = parseInt(headResponse.headers.get('Content-Length'))
        if (isNaN(totalSize) || !totalSize) {
            throw new Error('Bif size not working')
        }
        chunkSize <<= 10 // *1024
        for (let start = 0; start < totalSize; start += chunkSize) {
            const end = Math.min(start + chunkSize - 1, totalSize - 1)
            const reqConfig = { headers: { Range: `bytes=${start}-${end}` } }
            requests.push({ start, end, reqConfig })
        }
    }

    return requests
}

/**
 * Calculate bif chunk size
 * @param {Number} kbps
 * @param {Number} bufferSeconds
 * @return {Number}
 */
const calculateChunkSize = (kbps, bufferSeconds) => {
    let chunkSize = 64
    try {
        const kbPerSec = kbps / 8
        if (bufferSeconds > 20 && kbPerSec > 1000) {
            chunkSize = 1024
        } else if (kbPerSec > 1000) {
            chunkSize = 512
        } else if (kbPerSec > 500) {
            chunkSize = 256
        } else {
            chunkSize = 128
        }
    } catch (_e) {
        //ignore
    }
    return chunkSize
}

/**
 * @callback FindPreviewsCallBack
 * @param {Object} obj
 * @param {String} obj.bif
 * @param {Number} kbps
 * @param {Number} bufferSeconds
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
    const findPreviews = useCallback(async ({ bif }, kbps, bufferSeconds) => {
        /** @type {{chunks: Array<{start: Number, end: Number, slice: Uint8Array}>}} */
        let out = { chunks: [] }
        if (bif && worker) {
            let chunkIndex = 0, res
            const header = await fetchUtils.customFetch(
                bif,
                { headers: { Range: 'bytes=0-127' } },
                { direct: true, cache: false }
            )
            const imageCount = (new DataView(header.buffer).getUint32(12, true)) - 1
            const hasImageCount = 0 < imageCount && imageCount < 100000
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
                    worker.terminate()
                    if (!hasImageCount) {
                        res()
                    }
                }
            }

            downloadBifFile(bif, calculateChunkSize(kbps, bufferSeconds)).then(async requests => {
                for (const { start, end, reqConfig } of requests) {
                    const chunk = await fetchUtils.customFetch(bif, reqConfig, { direct: true, cache: false })
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
            setWorker(new Worker(BifWorker))
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
