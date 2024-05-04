
import { useCallback } from 'react'

/**
 * @param {Function} setContentList
 * @param {Number} quantity
 * @returns {Function}
 */
export const useMergeContentList = (setContentList, quantity) => {

    const mergeContentList = useCallback((items, index) => {
        setContentList(prevArray => {
            if (!Array.isArray(items)) {
                const size = Math.min(quantity * (index + 1) - prevArray.length, quantity)
                items = Array.from({ length: size }, () => items)
            }
            return [
                ...prevArray.slice(0, index),
                ...items,
                ...prevArray.slice(index + items.length)
            ]
        })
    }, [setContentList, quantity])

    return mergeContentList
}

export default useMergeContentList
