

import { useSetRecoilState } from 'recoil'

import {
    pathState, playContentState, selectedContentState,
    homePositionState, contentDetailBakState, homeBackupState
} from '../recoilConfig'

import back from '../back'
import { useCallback } from 'react'

/**
 * @callback setPlayableContent
 * @param {Object} obj
 * @param {Object} obj.contentToPlay
 * @param {String} [obj.backPath]
 * @param {String} [obj.contentBak]
 */

/**
 * @return {setPlayableContent}
 */
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
        }, [setContentDetailBak, setPlayContent, setPath]
    )
}

/**
 * @callback setContent
 * @param {Object} obj
 * @param {Object} obj.content
 * @param {Number} obj.rowIndex
 * @param {Number} obj.columnIndex
 * @param {String} [obj.backPath]
 * @param {String} [obj.contentBak]
 */

/**
 * @returns {setContent}
 */
export function useSetContent() {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Function} */
    const setPlayContent = useSetRecoilState(playContentState)
    /** @type {Function} */
    const setSelectedContent = useSetRecoilState(selectedContentState)
    /** @type {Function} */
    const setHomePosition = useSetRecoilState(homePositionState)
    /** @type {Function} */
    const setContentDetailBak = useSetRecoilState(contentDetailBakState)

    return useCallback(
        /**
         * @type {setContent}
         */
        ({ content, rowIndex, columnIndex, backPath = '/profiles/home', contentBak = {} }) => {
            back.pushHistory({
                doBack: () => {
                    setPath(backPath)
                }
            })
            if (['episode', 'musicConcert', 'movie', 'musicVideo'].includes(content.type)) {
                if (content.type === 'movie' && content.panel) {
                    setPlayContent({ ...content, ...content.panel, panel: null })
                } else {
                    setPlayContent(content)
                }
                setPath('/profiles/home/player')
            } else {
                setSelectedContent(content)
                setContentDetailBak(contentBak)
                setPath('/profiles/home/content')
            }
            setHomePosition({ rowIndex, columnIndex })
        }, [setPath, setPlayContent, setSelectedContent, setHomePosition, setContentDetailBak]
    )
}

/** @returns {Function} */
export function useResetHomeState() {
    /** @type {Function} */
    const setSelectedContent = useSetRecoilState(selectedContentState)
    /** @type {Function} */
    const setHomePosition = useSetRecoilState(homePositionState)
    /** @type {Function} */
    const setHomeBackup = useSetRecoilState(homeBackupState)

    return useCallback(() => {
        setHomePosition({ rowIndex: 0, columnIndex: 0 })
        setSelectedContent(null)
        setHomeBackup(null)
    }, [setSelectedContent, setHomePosition, setHomeBackup])
}

