
import { useCallback } from 'react'
import { useSetRecoilState } from 'recoil'

import { viewMountInfo } from './viewBackup'
import { pathState, initScreenState, selectedContentState, viewBackupState } from '../recoilConfig'
import back from '../back'

export const useNavigate = (viewKey) => {
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

