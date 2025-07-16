
import { useRef, useEffect, useCallback } from 'react'
import { useRecoilState } from 'recoil'
import { viewBackupState } from '../recoilConfig'
import { OrderedSet } from '../utils'

/*

All components that want to save their state before navigating and restore it after must use this hook.

Flow:

1. Each component registers its mount with a unique `viewKey`.
2. Each component saves its local state into `viewBackupRef.current = {myState}`.
3. One component triggers navigation using `useSetContentNavigate(viewKey)`.
4. During unmounting, each component registers its unmount.
5. Each component checks:
   5.1 If all components after the trigger are unmounted:

   * Collects all saved state.
   * Stores the global backup snapshot.
   * Schedules the back handler.
   * Clears internal tracking (`viewMountInfo`).

*/

export const viewMountInfo = {
    mountOrder: new OrderedSet(),
    oldViewBackups: [],

    /** @type {'forward'|'backward'|null} */
    _direction: null,
    get direction() {
        return this._direction
    },
    set direction(direction) {
        if (direction != null) {
            if (this._direction) {
                throw new Error(`ViewBackup direction not clean. ${this._direction}`)
            }
        }
        this._direction = direction
    },

    /** @type {string | null} */
    _viewKey: null,  // TODO: remover?
    get viewKey() {
        return this._viewKey
    },
    set viewKey(viewKey) {
        if (viewKey != null) {
            if (this._viewKey) {
                throw new Error(`ViewBackup viewKey not clean. ${this._viewKey}`)
            }
        }
        this._viewKey = viewKey
    },
    cleanStack() {
        /* Clears internal tracking */
        this._viewKey = null
        this._direction = null
    },
}

/**
 * @typedef ViewBackup
 * @type {Object}
 * @property {Object} viewBackup
 * @property {import('react').MutableRefObject<Object>} viewBackupRef
 * @property {Function} restoreState
 *
 * All component that want to save state before navigate and restore after
 * need to use this hook.
 *
 * @param {String} viewKey
 * @return {ViewBackup}
 */
export function useViewBackup(viewKey) {
    const viewBackupStateRef = useRef(useRecoilState(viewBackupState))
    const viewBackupRef = useRef({})
    const viewBackup = viewBackupStateRef.current[0][viewKey]

    const saveState = useCallback(() => {
        // if all component are unmounted
        const setViewBackup = viewBackupStateRef.current[1]
        let oldViewBackup = {}
        setViewBackup(prev => {  // reset global state and store an snapshot
            oldViewBackup = prev
            return {}
        })
        viewMountInfo.oldViewBackups.push(oldViewBackup)
        viewMountInfo.cleanStack()  // Clears internal tracking to star again
    }, [])

    const restoreState = useCallback(() => {
        const setViewBackup = viewBackupStateRef.current[1]
        const oldViewBackup = viewMountInfo.oldViewBackups.pop() || {}
        setViewBackup(oldViewBackup)
        viewMountInfo.cleanStack()
    }, [])

    useEffect(() => {
        const setViewBackup = viewBackupStateRef.current[1]

        if (viewMountInfo.mountOrder.has(viewKey)) {
            throw new Error(`ViewBackup error view already mounted. ${viewKey}`)
        }
        viewMountInfo.mountOrder.add(viewKey)  // registers mounting
        return () => {
            if (!viewMountInfo.mountOrder.has(viewKey)) {
                throw new Error(`ViewBackup error view already unmounted. ${viewKey}`)
            }
            viewMountInfo.mountOrder.remove(viewKey)  // registers unmounting
            if (viewMountInfo.direction === 'forward') {  // if has something to save
                // eslint-disable-next-line react-hooks/exhaustive-deps
                setViewBackup(prev => ({ ...prev, [viewKey]: viewBackupRef.current }))  // save state
            }
        }
    }, [viewKey])

    useEffect(() => {
        return () => {
            if (viewMountInfo.direction === 'forward') {
                if (viewMountInfo.mountOrder.lastElement == null) {
                    saveState()
                }
            }
        }
    }, [saveState, restoreState])

    return { viewBackup, viewBackupRef, restoreState }
}
