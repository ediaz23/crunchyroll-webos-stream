/* global self */

import utilsImpl from '../utils.impl.js'


self.onmessage = ({ data }) => {
    const { type, taskId, payload = [] } = data

    try {
        const result = utilsImpl[type](...(Array.isArray(payload) ? payload : [payload]))
        self.postMessage({ taskId, result, success: true })
    } catch (e) {
        self.postMessage({ taskId, error: e.message, success: false })
    }
}
