
import { useCallback, useEffect, useRef, startTransition } from 'react'
import { useSetRecoilState } from 'recoil'

import { pathState, playContentState, selectedContentState, viewBackupState } from '../recoilConfig'

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
        ({ content, restoreCurrentContent = false, saveCurrentState = true, saveHistory = true }) => {
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

            let backContent

            setContent(oldContent => {
                backContent = oldContent
                return content
            })

            let backPath

            setPath(oldPath => {
                backPath = oldPath
                return newPath
            })

            if (saveHistory) {
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
            }
        }, [setPath, setPlayContent, setSelectedContent, setViewBackup]
    )
}

/** @returns {Function} */
export function useResetHomeState() {
    /** @type {Function} */
    const setSelectedContent = useSetRecoilState(selectedContentState)
    /** @type {Function} */
    const setViewBackup = useSetRecoilState(viewBackupState)

    return useCallback(() => {
        setSelectedContent(null)
        setViewBackup({})
    }, [setSelectedContent, setViewBackup])
}
