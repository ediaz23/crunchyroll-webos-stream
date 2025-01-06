
import { useCallback, useState, useRef } from 'react'
import { useSetRecoilState, useRecoilState } from 'recoil'
import { homeViewReadyState, homeBackupState, homePositionState } from '../recoilConfig'


/**
 * @callback OnFilterCallBak
 * @param {Object} obj
 * @param {Number} obj.delay
 * @param {Boolean} [obj.scroll]
 */


/**
 * @typedef ListViewProps
 * @type {Object}
 * @property {Array<Object>} contentList List of content to show
 * @property {Number} quantity quantity to search
 * @property {Function} changeContentList set content list array
 * @property {Function} mergeContentList merge content list array
 * @property {Function} onLeave Function to call before leave
 * @property {OnFilterCallBak} onFilter call on filter with delay param
 * @property {Boolean} loading loading state
 * @property {Function} setLoading setState function for loading
 * @property {Boolean} delay delay to search
 * @property {Function} setDelay setState function for delay
 * @property {Boolean} autoScroll autoScroll grid
 * @property {Function} setAutoScroll setState function for autoScroll
 * @property {Array<Object>} contentListBak Backup of content List
 * @property {Object} optionBak Backup of options
 */

/**
 * @param {String} type
 * @param {Object} [homeBackupOverride]
 * @param {Object} [homePositionOverride]
 * @returns {ListViewProps}
 */
export const useContentList = (type, homeBackupOverride, homePositionOverride) => {
    /** @type {Function} */
    const setHomeViewReady = useSetRecoilState(homeViewReadyState)
    /** @type {[{options: Object, contentList: Array<Object>, type: string}, Function]} */
    const [homeBackup, setHomeBackup] = useRecoilState(homeBackupOverride || homeBackupState)
    /** @type {Function} */
    const setHomePosition = useSetRecoilState(homePositionOverride || homePositionState)
    /** @type {[Array<Object>, Function]} */
    const [contentList, setContentList] = useState(null)
    /** @type {[Boolean, Function]}  */
    const [autoScroll, setAutoScroll] = useState(true)
    /** @type {[Number, Function]} */
    const [delay, setDelay] = useState(-1)
    /** @type {{current: Set}} */
    const queue = useRef(new Set())
    /** @type {Number} */
    const quantity = 25

    /** @type {Function} */
    const changeContentList = useCallback((newList, resetIndex = true) => {
        setContentList(newList)
        setHomeViewReady(true)
        if (homeBackup && homeBackup.contentList !== newList && resetIndex) {
            setHomePosition({ rowIndex: 0 })
        }
    }, [setContentList, setHomeViewReady, homeBackup, setHomePosition])

    /** @type {Function} */
    const onLeave = useCallback((options, saveList = true) => {
        if (saveList) {
            setHomeBackup({ options, contentList, type })
        } else {
            setHomeBackup({ options, contentList: null, type })
        }
    }, [setHomeBackup, contentList, type])

    /** @type {Function} */
    const onFilter = useCallback(({ delay: delayP, scroll = false }) => {
        setAutoScroll(scroll)
        setDelay(delayP)
    }, [setDelay, setAutoScroll])

    /** @type {Function} */
    const mergeContentList = useCallback((items, index) => {
        const end = index + quantity
        let out = false
        if (Array.isArray(items)) {
            setContentList(prevArray => {
                let updatedList = items
                if (prevArray != null) {
                    updatedList = [...prevArray]
                    items.forEach((value, i) => {
                        updatedList[index + i] = value
                    })
                }
                return updatedList
            })
            for (let i = index; i < end; i++) {
                queue.current.delete(i)
            }
        } else {
            if (!queue.current.has(index)) {
                for (let i = index; i < end; i++) {
                    queue.current.add(i)
                }
                out = true
            }
        }
        return out
    }, [setContentList, quantity])

    return {
        contentList,
        quantity,
        delay, setDelay,
        autoScroll, setAutoScroll,
        changeContentList,
        mergeContentList,
        onLeave,
        onFilter,
        contentListBak: homeBackup && homeBackup.contentList,
        optionBak: homeBackup && homeBackup.options || {},
    }
}

export default useContentList
