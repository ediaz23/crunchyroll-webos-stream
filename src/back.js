
import 'webostvjs'
import { onWindowReady } from '@enact/core/snapshot'


/** @type {Array<{doBack: function}>} */
const historyStack = []

/** @type {{doBack: function}} */
let lastState = null

/** @param {{doBack: function}} state */
const pushHistory = state => {
    lastState = state
    historyStack.push(state)
}

/** @return {{doBack: function}} */
const popHistory = () => historyStack.pop()

/** @param {{doBack: function}} state */
const replaceHistory = state => { historyStack[historyStack.length - 1] = state }

/** @return {{doBack: function}} */
const getLastState = () => lastState

const doBack = () => {
    const state = popHistory()
    state.doBack()
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
})

export default {
    pushHistory,
    popHistory,
    replaceHistory,
    getLastState,
}
