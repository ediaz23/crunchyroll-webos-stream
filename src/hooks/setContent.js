
import { useCallback, startTransition } from 'react'
import { useSetRecoilState } from 'recoil'

import { pathState, playContentState, selectedContentState, viewBackupState } from '../recoilConfig'

import back from '../back'
import { isPlayable } from '../utils'
import { viewMountInfo } from './viewBackup'

/**
 * @callback SetContent
 * @param {Object} obj
 * @param {Object} obj.content
 * @param {Boolean} [obj.saveHistory]
 * @param {Boolean} [obj.restoreCurrentContent]
 */

/**
 * @param {String} viewKey
 * @returns {SetContent}
 */
export function useSetContentNavigate(viewKey) {
    if (viewKey == null) { new Error(`ViewBackup viewKey require`) }
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Function} */
    const setPlayContent = useSetRecoilState(playContentState)
    /** @type {Function} */
    const setSelectedContent = useSetRecoilState(selectedContentState)
    /** @type {Function} */
    const setViewBackup = useSetRecoilState(viewBackupState)

    return useCallback(
        /**
         * @type {SetContent}
         */
        ({ content, restoreCurrentContent = false, saveHistory = true }) => {
            let newPath, setContent
            if (viewMountInfo.viewKeyTrigger != null) {
                /* set which component init unmounting process */
                const errMsg = `viewKeyTrigger ${viewMountInfo.viewKeyTrigger}`
                throw new Error(`ViewBackup viewKeyTrigger not clean. viewKey ${viewKey} ${errMsg}`)
            }
            viewMountInfo.viewKeyTrigger = viewKey
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
                new Promise(res => {
                    /* this promise wait to know oldViewBackup to restore it later */
                    if (viewMountInfo.saveViewBackup) {
                        throw new Error(`ViewBackup saveViewBackup not clean. viewKey ${viewKey}`)
                    }
                    viewMountInfo.saveViewBackup = res
                }).then(oldViewBackup => {
                    /* wish set this code outside promise but i need to know oldViewBackup to restore it later */
                    back.pushHistory({
                        doBack: () => {
                            setPath(backPath)
                            startTransition(() => {
                                setViewBackup(oldViewBackup)
                                if (restoreCurrentContent) {
                                    setContent(backContent)
                                }
                                viewMountInfo.cleanStack()
                            })
                        }
                    })
                })
            }
        }, [viewKey, setViewBackup, setPath, setPlayContent, setSelectedContent]
    )
}
