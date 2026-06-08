
import { useCallback, useState, useRef, useMemo } from 'react'
import { useSetRecoilState } from 'recoil'

import { homeViewReadyState } from '../recoilConfig'
import { useNavigateContent } from './navigate'
import { $L } from './language'


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
 * @property {Object} viewBackup Backup of options
 * @property {import('react').MutableRefObject} viewBackupRef Backup of options
 * @property {import('./setContent').SetContent} navigateContent set content an navegate
 */

/**
 * @param {String} sortBack
 * @param {Function} onFilter
 * @returns {[String, Array<{key: String, value: String}>,String, Function]}
 */
export const useOrderOptions = (sortBack, onFilter) => {
    /** @type {[String, Function]}  */
    const [sort, setOrder] = useState(sortBack || 'newly_added')

    /** @type {Array<{key: String, value: String}>} */
    const orderLabels = useMemo(() => {
        return [{
            key: 'newly_added',
            value: $L('Newly'),
        }, {
            key: 'popularity',
            value: $L('Popularity'),
        }, {
            key: 'alphabetical',
            value: $L('Alphabetical'),
        }]
    }, [])

    /** @type {Array<String>} */
    const orderStr = useMemo(() => orderLabels.map(i => i.value), [orderLabels])

    /** @type {Function} */
    const onSelectOrder = useCallback(({ selected }) => {
        setOrder(orderLabels[selected].key)
        onFilter({ delay: 0 })
    }, [orderLabels, setOrder, onFilter])

    return [sort, orderLabels, orderStr, onSelectOrder]
}

/**
 * @param {String} viewModeBack
 * @param {Function} onFilter
 * @returns {[String, Array<{key: String, value: String}>,String, Function]}
 */
export const useViewModes = (viewModeBack, onFilter) => {
    /** @type {[String, Function]}  */
    const [viewMode, setViewMode] = useState(viewModeBack || 'all')

    /** @type {Array<{key: String, value: String}>} */
    const viewModeLabels = useMemo(() => {
        return [{
            key: 'all',
            value: $L('All'),
        }, {
            key: 'sub',
            value: $L('Subtitled'),
        }, {
            key: 'dub',
            value: $L('Dubbed'),
        }]
    }, [])

    /** @type {Array<String>} */
    const viewModeStr = useMemo(() => viewModeLabels.map(i => i.value), [viewModeLabels])

    /** @type {Function} */
    const onSelectViewMode = useCallback(({ selected }) => {
        setViewMode(viewModeLabels[selected].key)
        onFilter({ delay: 0 })
    }, [viewModeLabels, setViewMode, onFilter])

    return [viewMode, viewModeLabels, viewModeStr, onSelectViewMode]
}


/**
 * @param {String} type
 * @param {Object} [homeBackupOverride]
 * @param {Object} [homePositionOverride]
 * @returns {ListViewProps}
 */
export const useContentList = (type) => {
    const { navigateContent, viewBackup, viewBackupRef } = useNavigateContent(type)
    /** @type {Function} */
    const setHomeViewReady = useSetRecoilState(homeViewReadyState)
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
        viewBackup,
        viewBackupRef,
        navigateContent
    }
}

export default useContentList
