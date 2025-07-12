
import { useCallback, useState, useRef } from 'react'
import { useSetRecoilState } from 'recoil'
import { homeViewReadyState } from '../recoilConfig'
import { useViewBackup } from './viewBackup'
import { useSetContent } from './setContent'


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
 * @property {OnFilterCallBak} onFilter call on filter with delay param
 * @property {Boolean} loading loading state
 * @property {Function} setLoading setState function for loading
 * @property {Boolean} delay delay to search
 * @property {Function} setDelay setState function for delay
 * @property {Boolean} autoScroll autoScroll grid
 * @property {Function} setAutoScroll setState function for autoScroll
 * @property {Object} backState Backup of options
 * @property {import('react').MutableRefObject} viewBackupRef Backup of options
 * @property {Function} setContentNavagate set content an navegate
 */

/**
 * @param {String} type
 * @param {Object} [homeBackupOverride]
 * @param {Object} [homePositionOverride]
 * @returns {ListViewProps}
 */
export const useContentList = (type) => {
    const [backState, viewBackupRef] = useViewBackup(type)
    /** @type {Function} */
    const setHomeViewReady = useSetRecoilState(homeViewReadyState)
    /** @type {Function} */
    const setContentNavagate = useSetContent()
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
    const changeContentList = useCallback((newList) => {
        setAutoScroll(true)
        setContentList(newList)
        setHomeViewReady(true)
    }, [setContentList, setHomeViewReady, setAutoScroll])

    /** @type {Function} */
    const onFilter = useCallback(({ delay: delayP }) => {
        setAutoScroll(false)
        setDelay(delayP)
    }, [setDelay, setAutoScroll])

    /** @type {Function} */
    const mergeContentList = useCallback((items, index) => {
        const end = index + quantity
        let out = false
        if (Array.isArray(items)) {
            setAutoScroll(false)
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
    }, [setContentList, quantity, setAutoScroll])

    return {
        contentList,
        quantity,
        delay, setDelay,
        autoScroll, setAutoScroll,
        changeContentList,
        mergeContentList,
        onFilter,
        backState,
        viewBackupRef,
        setContentNavagate
    }
}

export default useContentList
