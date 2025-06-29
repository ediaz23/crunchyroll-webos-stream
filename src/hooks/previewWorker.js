/* global Worker */

import { useEffect, useRef, useCallback } from 'react'
import * as fetchUtils from './customFetch'

const BifWorker = new URL('../workers/bif.worker.js', import.meta.url)

/**
 * @typedef PreviewWorker
 * @type {Object}
 * @property {Function} newTask
 * @property {Function} append
 * @property {Function} cancel
 * @property {Function} terminate
 */

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
 * @returns {PreviewWorker}
 */
export const createPreviewWorker = () => {
    const worker = new Worker(BifWorker)
    const listeners = new Map()
    let seq = 0

    worker.onmessage = ({ data }) => {
        const cb = listeners.get(data.taskId)
        if (cb) {
            cb(data.slices)
        }
    }

    return {
        newTask: (cb) => {
            const id = ++seq
            listeners.set(id, cb)
            return id
        },
        append: (taskId, chunk, offset, last) => {
            worker.postMessage({ type: 'append', taskId, chunk, offset, last }, [chunk.buffer])
        },
        cancel: (taskId) => {
            worker.postMessage({ type: 'cancel', taskId })
            listeners.delete(taskId)
        },
        terminate: () => worker.terminate()
    }
}


/**
 * @returns {{
        findPreviews: ({ bif }) => Promise<{chunks: Array}>,
        cancelPreviews: Function
    }}
 */
export function usePreviewWorker() {
    /** @type {{current: PreviewWorker}} */
    const streamRef = useRef(null)
    /** @type {{current: {id: Number, active: Boolean}}} */
    const currentTask = useRef({ id: 0, active: true })

    /** @type {Function} */
    const cancelPreviews = useCallback(() => {
        const task = currentTask.current
        if (task && task.id && streamRef.current) {
            streamRef.current.cancel(task.id)
            task.active = false
        }
    }, [])

    /**
     * @param {{ bif: String }} param
     * @returns {Promise<{chunks: Array<{start: Number, end: Number, url: String}>}>}
     */
    const findPreviews = useCallback(async ({ bif }) => {
        /** @type {{chunks: Array<{start: Number, end: Number, url: String}>}} */
        let out = { chunks: [] }
        if (bif) {
            cancelPreviews()
            const thisTaskId = Date.now()
            const header = await fetchUtils.customFetch(bif, { headers: { Range: 'bytes=0-127' } }, true)
            const imageCount = (new DataView(header.buffer).getUint32(12, true)) - 1
            let chunkIndex = 0

            out.chunks = Array.from({ length: imageCount })
            currentTask.current = { id: thisTaskId, active: true }

            /** @type {Function} */
            const appendSlise = (slices) => {
                if (currentTask.current.id === thisTaskId & currentTask.current.active) {
                    slices.forEach(({ start, end, slice }) => {
                        const blob = new Blob([slice], { type: 'image/jpeg' })
                        const url = URL.createObjectURL(blob)
                        out.chunks[chunkIndex++] = { start, end, url }
                    })
                }
            }
            /** @type {Number} */
            const taskId = streamRef.current.newTask(appendSlise)

            downloadBifFile(bif).then(async requests => {
                for (const { start, end, getData } of requests) {
                    if (currentTask.current.id === thisTaskId & currentTask.current.active) {
                        const data = await getData()
                        streamRef.current.append(taskId, data, start, end === requests[requests.length - 1].end)
                    } else {
                        break
                    }
                }
                if (currentTask.current.id !== thisTaskId || !currentTask.current.active) {
                    streamRef.current.cancel(taskId)
                }
            })
        }
        return out
    }, [cancelPreviews])

    useEffect(() => {
        streamRef.current = createPreviewWorker()
        return () => streamRef.current.terminate()
    }, [])

    return { findPreviews, cancelPreviews }
}
