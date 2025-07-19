
import { useCallback, useRef, useEffect } from 'react'


/**
 * @param {Function} callback
 * @param {Number} [delay]
 * @return {Function}
 */
export function useDelayedCall(callback, delay = 500) {
    const timeoutRef = useRef(null)

    const onEvent = useCallback((ev) => {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            callback(ev)
        }, delay)
    }, [callback, delay])

    useEffect(() => {
        return () => {
            clearTimeout(timeoutRef.current)
        }
    }, [])

    return onEvent
}
