
import 'webostvjs'
import { onWindowReady } from '@enact/core/snapshot'


/** @type {Array<{doBack: Function}>} */
const historyStack = []

/**
 * Push a new state
 * @param {{doBack: Function}} state
 */
const pushHistory = state => historyStack.push(state)

/**
 * Return and remove first state
 * @return {{doBack: Function}}
 */
const popHistory = () => historyStack.pop()

/**
 * Replace last state
 * @param {{doBack: Function}} state
 */
const replaceHistory = state => { historyStack[historyStack.length - 1] = state }

/**
 * Turn back to the previous view
 */
const doBack = () => {
    const state = popHistory()
    if (state) {
        state.doBack()
    }
}

/**
 * Clean all history
 */
const cleanHistory = () => historyStack.splice(0, historyStack.length)

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
    cleanHistory,
}
