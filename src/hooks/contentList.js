
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
 * @returns {ListViewProps}
 */
export const useContentList = (type) => {

    /** @type {Function} */
    const setHomeViewReady = useSetRecoilState(homeViewReadyState)
    /** @type {[{options: Object, contentList: Array<Object>, type: string}, Function]} */
    const [homeBackup, setHomeBackup] = useRecoilState(homeBackupState)
    /** @type {Function} */
    const setHomePosition = useSetRecoilState(homePositionState)
    /** @type {[Array<Object>, Function]} */
    const [contentList, setContentList] = useState(null)
    /** @type {[Boolean, Function]}  */
    const [autoScroll, setAutoScroll] = useState(true)
    /** @type {[Number, Function]} */
    const [delay, setDelay] = useState(-1)
    /** @type {{current: Array<{start: Number, end: Number}>}} */
    const queue = useRef([])
    /** @type {Number} */
    const quantity = 20

    /** @type {Function} */
    const changeContentList = useCallback((newList) => {
        setContentList(newList)
        setHomeViewReady(true)
        if (homeBackup && homeBackup.contentList !== newList) {
            setHomePosition({ rowIndex: 0 })
        }
    }, [setContentList, setHomeViewReady, homeBackup, setHomePosition])

    /** @type {Function} */
    const onLeave = useCallback((options) => {
        setHomeBackup({ options, contentList, type })
    }, [setHomeBackup, contentList, type])

    /** @type {Function} */
    const onFilter = useCallback(({ delay: delayP, scroll = false }) => {
        setAutoScroll(scroll)
        setDelay(delayP)
    }, [setDelay, setAutoScroll])

    /** @type {Function} */
    const mergeContentList = useCallback((items, index) => {
        let out = false
        /** all this code is for avoid multiples request onload */
        if (!Array.isArray(items)) {
            if (items === undefined) {
                queue.current = queue.current.filter(i => !(i.start <= index && index <= i.end))
                out = true
            } else {
                if (!queue.current.find(i => i.start <= index && index <= i.end)) {
                    queue.current.push({ start: index, end: index + quantity })
                    out = true
                }
            }
        } else {
            queue.current = queue.current.filter(i => !(i.start <= index && index <= i.end))
            out = true
        }
        /** -------------------------------------------------- */
        if (out) {
            setContentList(prevArray => {
                if (!Array.isArray(items)) {
                    const size = Math.min(prevArray.length - index, quantity)
                    items = Array.from({ length: size }, () => items)
                }
                return [
                    ...prevArray.slice(0, index),
                    ...items,
                    ...prevArray.slice(index + items.length)
                ]
            })
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
