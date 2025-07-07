
import { useEffect, useCallback, useRef } from 'react'

const HomeFeedWorker = new URL('../workers/homefeed.worker.js', import.meta.url)

/**
 * @typedef HomefeedItem
 * @type {Object}
 * @property {String} id
 * @property {String} type
 * @property {String} title
 * @property {String} description
 * @property {String} analyticsId
 * @property {Array<String>} contentIds
 * @property {Array<HomefeedItem>} items
 * @property {String} contentId
 * @property {String} link
 */

/**
 * @callback ProcessHomeFeedCallBack
 * @param {Object} obj
 * @param {Array<{resource_type: String}>} obj.data
 * @returns {Promise<Array>}
 */

/**
 * @returns {ProcessHomeFeedCallBack}
 */
export function useHomeFeedWorker() {
    /** @type {{current: Worker} */
    const workerRef = useRef(null)

    /**
     * @type {ProcessHomeFeedCallBack}
     */
    const processHomeFeed = useCallback(async ({ data: payload, type }) => new Promise((res, rej) => {
        if (workerRef.current && payload) {
            /** @param {{data: {success: Boolean, result: Object, error: String}>}} */
            workerRef.current.onmessage = ({ data }) => {
                if (data.success) {
                    res(data.result)
                } else {
                    rej(new Error(data.error))
                }
            }
            workerRef.current.postMessage({ payload, type })
        } else {
            res([])
        }
    }), [])

    useEffect(() => {
        workerRef.current = new window.Worker(HomeFeedWorker)
        return () => {
            workerRef.current.terminate()
        }
    }, [])

    return processHomeFeed
}
