/* global Worker */

import { useEffect, useCallback, useState } from 'react'
import * as fetchUtils from './customFetch'

const BifWorker = new URL('../workers/bif.worker.js', import.meta.url)

/**
 * Download file per chunkSize
 * @param {String} url
 * @param {Number} chunkSize
 * @returns {Promise<Array<{start: Number, end: Number, getData: () => Promise<Uint8Array>}>>}
 */
export const downloadBifFile = async (url, chunkSize = 1024 * 1024) => {
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
 * @param {Boolean} active
 * @returns {{
        findPreviews: ({ bif }) => Promise<{chunks: Array}>,
    }}
 */
export function usePreviewWorker(active) {
    /** @type {[Worker, Function]} */
    const [worker, setWorker] = useState(null)

    /**
     * @param {{ bif: String }} param
     * @returns {Promise<{chunks: Array<{start: Number, end: Number, url: String}>}>}
     */
    const findPreviews = useCallback(async ({ bif }) => {
        /** @type {{chunks: Array<{start: Number, end: Number, url: String}>}} */
        let out = { chunks: [] }
        if (bif && worker) {
            const header = await fetchUtils.customFetch(bif, { headers: { Range: 'bytes=0-127' } }, true)
            const imageCount = (new DataView(header.buffer).getUint32(12, true)) - 1
            let chunkIndex = 0

            out.chunks = Array.from({ length: imageCount })
            worker.isActive = true
            worker.onmessage = ({ data }) => {
                data.slices.forEach(({ start, end, slice, last }) => {
                    const blob = new Blob([slice], { type: 'image/jpeg' })
                    const url = URL.createObjectURL(blob)
                    out.chunks[chunkIndex++] = { start, end, url }
                    if (last && worker.isActive) {
                        worker.terminate()
                        worker.isActive = false
                    }
                })
            }

            downloadBifFile(bif).then(async requests => {
                for (const { start, end, getData } of requests) {
                    const chunk = await getData()
                    const last = end === requests[requests.length - 1].end
                    worker.postMessage({ type: 'append', chunk, start, last, }, [chunk.buffer])
                }
            })
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

    return { findPreviews }
}
