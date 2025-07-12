
import { useCallback, useEffect, useRef, startTransition } from 'react'
import { useSetRecoilState } from 'recoil'

import {
    pathState, playContentState, selectedContentState,
    homePositionState, contentDetailBackupState,
    contentDetailBakState, contentDetailPositionState,
    viewBackupState,
} from '../recoilConfig'

import back from '../back'
import { isPlayable } from '../utils'

/**
 * @callback SetContent
 * @param {Object} obj
 * @param {Object} obj.content
 * @param {Boolean} [obj.saveCurrentState]
 * @param {Boolean} [obj.restoreCurrentContent]
 */

/** @returns {SetContent} */
export function useSetContentNavigate() {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Function} */
    const setPlayContent = useSetRecoilState(playContentState)
    /** @type {Function} */
    const setSelectedContent = useSetRecoilState(selectedContentState)
    /** @type {Function} */
    const setViewBackup = useSetRecoilState(viewBackupState)
    const backRef = useRef({})
    const doBackRef = useRef(false)

    useEffect(() => {
        return () => {
            if (doBackRef.current) {  // only on component can save all state
                setViewBackup(prev => {
                    backRef.current = prev
                    return {}
                })
            }
        }
    }, [setViewBackup])

    return useCallback(
        /**
         * @type {SetContent}
         */
        ({ content, saveCurrentState = true, restoreCurrentContent = false }) => {
            let newPath, setContent
            doBackRef.current = saveCurrentState  // active save state
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

            let backPath, backContent
            setContent(oldContent => {
                backContent = oldContent
                return content
            })
            setPath(oldPath => {
                backPath = oldPath
                return newPath
            })

            back.pushHistory({
                doBack: () => {
                    setPath(backPath)
                    startTransition(() => {
                        if (restoreCurrentContent) {
                            setContent(backContent)
                        }
                        setViewBackup(backRef.current)
                    })
                }
            })
        }, [setPath, setPlayContent, setSelectedContent, setViewBackup]
    )
}

/** @returns {Function} */
export function useResetHomeState() {
    /** @type {Function} */
    const setSelectedContent = useSetRecoilState(selectedContentState)
    /** @type {Function} */
    const setHomePosition = useSetRecoilState(homePositionState)
    /** @type {Function} */
    const setViewBackup = useSetRecoilState(viewBackupState)

    return useCallback(() => {
        setHomePosition({ rowIndex: 0, columnIndex: 0 })
        setSelectedContent(null)
        setViewBackup({})
    }, [setSelectedContent, setHomePosition, setViewBackup])
}


/**
 * @callback replaceSelectedContent
 * @param {Object} obj
 * @param {Object} obj.content
 * @param {Number} obj.rowIndex
 * @param {Object} [obj.contentBak]
 */

/** @returns {replaceSelectedContent} */
export function useReplaceSelectedContent() {

    /** @type {Function} */
    const setSelectedContent = useSetRecoilState(selectedContentState)
    /** @type {Function} */
    const setContentDetailBak = useSetRecoilState(contentDetailBakState)
    /** @type {Function} */
    const setContentDetailBackup = useSetRecoilState(contentDetailBackupState)
    /** @type {Function} */
    const setContentDetailPosition = useSetRecoilState(contentDetailPositionState)

    const replaceSelectedContent = useCallback(
        /** @type {replaceSelectedContent} */
        ({ content, rowIndex, contentBak = {} }) => {
            let selectedContentBak = null
            setSelectedContent(selectedContentOld => {
                selectedContentBak = { ...(selectedContentOld || {}) }
                return content
            })

            let contentDetailBak = null
            setContentDetailBak(contentDetailOld => {
                contentDetailBak = { ...(contentDetailOld || {}) }
                return {}
            })

            let contentDetailBackupBak = null
            setContentDetailBackup(contentDetailBackupOld => {
                contentDetailBackupBak = { ...(contentDetailBackupOld || {}) }
                return null
            })

            let contentDetailPositionBak = null
            setContentDetailPosition(contentDetailPositionOld => {
                contentDetailPositionBak = { ...(contentDetailPositionOld || {}) }
                return { rowIndex: 0, columnIndex: 0 }
            })

            back.pushHistory({
                doBack: () => {
                    setSelectedContent(selectedContentBak)
                    setContentDetailBak({ ...contentDetailBak, ...contentBak })
                    setContentDetailBackup(contentDetailBackupBak)
                    setContentDetailPosition({ ...contentDetailPositionBak, rowIndex })
                }
            })

        }, [setSelectedContent, setContentDetailBak, setContentDetailBackup, setContentDetailPosition]
    )
    return replaceSelectedContent
}

