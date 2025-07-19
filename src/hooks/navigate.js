
import { useCallback } from 'react'
import { useSetRecoilState } from 'recoil'

import {
    pathState, initScreenState,
    viewBackupState, selectedContentState, playContentState
} from '../recoilConfig'

import back from '../back'
import { isPlayable } from '../utils'
import { viewMountInfo, useViewBackup } from './viewBackup'


export const useNavigate = () => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Function} */
    const setInitScreenState = useSetRecoilState(initScreenState)

    const goTo = useCallback(
        /**
         * @param {string} path
         * @param {Object} obj
         * @param {Function} obj.callBack
         */
        (path, { callBack } = {}) => {
            setPath(bak => {
                back.pushHistory({
                    doBack: () => {
                        if (callBack) {
                            callBack()
                        }
                        setPath(bak)
                    }
                })
                return path
            })
        },
        [setPath]
    )

    const jumpTo = useCallback(
        /**
         * @param {string} path
         */
        (path) => {
            back.cleanHistory()
            back.pushHistory({ doBack: () => setPath('/askClose') })
            setInitScreenState(path)
            setPath(path)
        },
        [setInitScreenState, setPath]
    )

    const goBack = useCallback(() => {
        back.doBack()
    }, [])

    const pushHistory = useCallback(
        /**
         * @param {Function} doBack
         */
        (doBack) => {
            back.pushHistory({ doBack })
        },
        []
    )

    const popHistory = useCallback(() => {
        back.popHistory()
    }, [])

    return { goTo, jumpTo, goBack, pushHistory, popHistory }
}

/**
 * @callback SetContent
 * @param {Object} content
 * @param {Object} obj
 * @param {Boolean} [obj.saveHistory]
 * @param {Boolean} [obj.restoreCurrentContent]
 */

/**
 * @param {String} viewKey
 */
export function useNavigateContent(viewKey) {
    const navigate = useNavigate()
    const { goTo } = navigate
    const viewBackupHook = useViewBackup(viewKey)
    const { restoreState } = viewBackupHook
    /** @type {Function} */
    const setPlayContent = useSetRecoilState(playContentState)
    /** @type {Function} */
    const setSelectedContent = useSetRecoilState(selectedContentState)

    const navigateContent = useCallback(
        /**
         * @type {SetContent}
         */
        (content, { restoreCurrentContent = false } = {}) => {
            let newPath, setContent
            viewMountInfo.direction = 'forward'
            if (isPlayable(content.type)) {
                if (content.type === 'movie' && content.panel) {
                    content = { ...content, ...content.panel, panel: null }
                }
                setContent = setPlayContent
                newPath = '/profiles/home/player'
            } else {
                setContent = setSelectedContent
                newPath = '/profiles/home/content'
            }

            let backContent

            setContent(oldContent => {
                backContent = oldContent
                return content
            })
            goTo(newPath, {
                callBack: () => {
                    viewMountInfo.direction = 'backward'
                    restoreState()
                    if (restoreCurrentContent) {
                        setContent(backContent)
                    }
                }
            })
        }, [setPlayContent, setSelectedContent, goTo, restoreState]
    )

    return { navigateContent, ...viewBackupHook, ...navigate }
}


/** @returns {Function} */
export function useResetHomeState() {
    /** @type {Function} */
    const setSelectedContent = useSetRecoilState(selectedContentState)
    /** @type {Function} */
    const setViewBackup = useSetRecoilState(viewBackupState)

    return useCallback(() => {
        setViewBackup({})
        setSelectedContent(null)
        viewMountInfo.cleanStack()
    }, [setSelectedContent, setViewBackup])
}

