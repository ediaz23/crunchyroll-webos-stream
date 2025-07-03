/* global self importScripts */

self.onmessage = ({ data }) => {
    const { scriptPath, type, taskId, payload = [] } = data

    try {
        if (!self.fflate) {
            importScripts(`${scriptPath}/node_modules/fflate/umd/index.js`)
        }
        if (!self.workObj) {
            importScripts(`${scriptPath}/src/utils.impl.js`)
        }

        const result = self.workObj[type](...(Array.isArray(payload) ? payload : [payload]))
        self.postMessage({ taskId, result, success: true })
    } catch (e) {
        self.postMessage({ taskId, error: e.message, success: false })
    }
}
