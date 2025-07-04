/* global Worker */

import { useEffect, useCallback, useState } from 'react'
import * as fetchUtils from './customFetch'

const BifWorker = new URL('../workers/bif.worker.js', import.meta.url)

/**
 * Download file per chunkSize
 * @param {String} url
 * @param {Number} [chunkSize]
 * @returns {Promise<Array<{start: Number, end: Number, getData: () => Promise<Uint8Array>}>>}
 */
export const downloadBifFile = async (url, chunkSize = 256 * 1024) => {
    const headResponse = await fetchUtils.customFetch(url, { method: 'HEAD' })
    /** @type {Array<{start: Number, end: Number, getData: () => Promise<Uint8Array>}>} */
    const requests = []
    if (headResponse.ok) {
        const totalSize = parseInt(headResponse.headers.get('Content-Length'))
        if (isNaN(totalSize) || !totalSize) {
            throw new Error('Bif size not working')
        }
        for (let start = 0; start < totalSize; start += chunkSize) {
            const end = Math.min(start + chunkSize - 1, totalSize - 1)
            const reqConfig = { headers: { Range: `bytes=${start}-${end}` } }
            requests.push({ start, end, getData: () => fetchUtils.customFetch(url, reqConfig, true) })
        }
    }

    return requests
}

/**
 * @callback FindPreviewsCallBack
 * @param {Object} obj
 * @param {String} obj.bif
 * @param {Number} [chunkSize]
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
    const findPreviews = useCallback(async ({ bif }, chunkSize = 256 * 1024) => {
        /** @type {{chunks: Array<{start: Number, end: Number, slice: Uint8Array}>}} */
        let out = { chunks: [] }
        if (bif && worker) {
            let chunkIndex = 0, res
            const header = await fetchUtils.customFetch(bif, { headers: { Range: 'bytes=0-127' } }, true)
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
            downloadBifFile(bif, chunkSize).then(async requests => {
                for (const { start, end, getData } of requests) {
                    const chunk = await getData()
                    const last = end === requests[requests.length - 1].end
                    worker.postMessage({ type: 'append', chunk, start, last, }, [chunk.buffer])
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
                    oldWorker.terminate()
                }
                return null
            })
        }
    }, [active])

    return findPreviews
}
