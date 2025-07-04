/* global Worker */

import { useEffect, useCallback, useState } from 'react'

const HomeFeedWorker = new URL('../workers/homefeed.worker.js', import.meta.url)

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
    /** @type {[Worker, Function]} */
    const [worker, setWorker] = useState(null)

    /**
     * @type {ProcessHomeFeedCallBack}
     */
    const processHomeFeed = useCallback(async (payload) => new Promise((res, rej) => {
        if (worker && payload && payload.data) {
            /** @param {{data: {success: Boolean, result: Object, error: String}>}} */
            worker.onmessage = ({ data }) => {
                if (data.success) {
                    res(data.result)
                } else {
                    rej(new Error(data.error))
                }
            }
            worker.postMessage({ type: 'legacy', payload })
        } else {
            res([])
        }
    }), [worker])

    useEffect(() => {
        setWorker(new Worker(HomeFeedWorker))
        return () => {
            setWorker(oldWorker => {
                if (oldWorker) {
                    oldWorker.terminate()
                }
                return null
            })
        }
    }, [])

    return processHomeFeed
}
