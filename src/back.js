
import 'webostvjs'
import { onWindowReady } from '@enact/core/snapshot'
import utils from './utils'


/** @type {Array<{doBack: function}>} */
const historyStack = []

/** @param {{doBack: function}} state */
const pushHistory = state => historyStack.push(state)

const popHistory = () => historyStack.pop()

/** @param {{doBack: function}} state */
const replaceHistory = state => { historyStack[historyStack.length - 1] = state }

const doBack = () => {
    const state = popHistory()
    state.doBack()
}

/**
 * @param {Array} backList
 * @param {Function} setFilePath
 */
const backPath = (backList, setFilePath) => {
    if (backList.length) {
        const backList2 = backList.slice(0, backList.length - 1)
        pushHistory({ doBack: () => backPath(backList2, setFilePath) })
    }
    setFilePath(backList)
}

onWindowReady(() => {
    window.addEventListener('keydown', function(inEvent) {
        let keycode
        if (window.event) {
            keycode = inEvent.keyCode;
        } else if (inEvent.which) {
            keycode = inEvent.which;
        }
        if (keycode === 461) {
            doBack()
        }
    })

    if (utils.isTv()) {
        pushHistory({
            doBack: () => {
                window.close()
            }
        })
    }
})

export default {
    pushHistory,
    popHistory,
    replaceHistory,
    backPath,
}
