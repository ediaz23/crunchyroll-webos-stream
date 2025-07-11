
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
 * @callback setPlayableContent
 * @param {Object} obj
 * @param {Object} obj.contentToPlay
 * @param {String} [obj.backPath]
 * @param {Object} [obj.contentBak]
 */

/** @return {setPlayableContent} */
export function useSetPlayableContent() {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Function} */
    const setPlayContent = useSetRecoilState(playContentState)
    /** @type {Function} */
    const setContentDetailBak = useSetRecoilState(contentDetailBakState)

    return useCallback(
        /** @type {setPlayableContent} */
        ({ contentToPlay, backPath = '/profiles/home/content', contentBak = {} }) => {
            back.pushHistory({
                doBack: () => {
                    setPath(backPath)
                }
            })
            setContentDetailBak(contentBak)
            setPlayContent(contentToPlay)
            setPath('/profiles/home/player')
        },
        [setContentDetailBak, setPlayContent, setPath]
    )
}

/**
 * @callback setContent
 * @param {Object} obj
 * @param {Object} obj.content
 * @param {String} [obj.backPath]
 */

/** @returns {setContent} */
export function useSetContent() {
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
         * @type {setContent}
         */
        ({ content, backPath = '/profiles/home' }) => {
            back.pushHistory({
                doBack: () => {
                    setPath(backPath)
                    startTransition(() => {
                        setViewBackup(backRef.current)
                    })
                }
            })
            doBackRef.current = true  // active save state
            if (isPlayable(content.type)) {
                if (content.type === 'movie' && content.panel) {
                    setPlayContent({ ...content, ...content.panel, panel: null })
                } else {
                    setPlayContent(content)
                }
                setPath('/profiles/home/player')
            } else {
                setSelectedContent(content)
                setPath('/profiles/home/content')
            }
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

