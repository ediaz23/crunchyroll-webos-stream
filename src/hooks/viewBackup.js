
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
    _viewKey: null,
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
    /** @type {string | null} */
    /*
    lastViewKey: null,
    updateLastViewKey() {
        const viewKey = this._viewKey
        const index = this.mountOrder.indexOf(viewKey)
        if (index === -1) {
            throw new Error(`ViewBackup error view not-mounted. ${viewKey} updateLastViewKey`)
        }
        this.lastViewKey = index === 0 ? null : this.mountOrder.getList()[index - 1]
    },
    */
    allUnmounted(viewKey) {
        let allUnmounted = false

        if (viewKey == null) {
            allUnmounted = this.mountOrder.every(key => this.unmounted.has(key))
        } else {
            /* if all componente are unmounted should save state */
            const index = this.mountOrder.indexOf(viewKey)
            if (index === -1) { throw new Error(`ViewBackup error view never mounted. ${viewKey}`) }
            const afterKeys = this.mountOrder.slice(index)
            allUnmounted = afterKeys.every(key => this.unmounted.has(key))
        }
        return allUnmounted
    },
    /** @type {Function | null} */
    afterRestoreState: null,
    cleanStack() {
        /* Clears internal tracking */
        this._viewKey = null
        this._direction = null
        this.afterRestoreState = null
    },
}

/**
 * All component that want to save state before navigate and restore after
 * need to use this hook.
 *
 * @param {String} viewKey
 * @return {[Object, import('react').MutableRefObject<Object>]}
 */
export function useViewBackup(viewKey) {
    const viewBackupStateRef = useRef(useRecoilState(viewBackupState))
    const viewBackupRef = useRef({})

    const saveState = useCallback(() => {
        // if all component are unmounted
        const setViewBackup = viewBackupStateRef.current[1]
        let oldViewBackup = {}
        setViewBackup(prev => {  // reset global state and store an snapshot
            oldViewBackup = prev
            return {}
        })
        debugger;
        viewMountInfo.oldViewBackups.push(oldViewBackup)
        viewMountInfo.cleanStack()  // Clears internal tracking to star again
    }, [])

    const restoreState = useCallback(() => {
        debugger;
        const setViewBackup = viewBackupStateRef.current[1]
        const oldViewBackup = viewMountInfo.oldViewBackups.pop() || {}
        setViewBackup(oldViewBackup)
        if (viewMountInfo.afterRestoreState) {
            viewMountInfo.afterRestoreState()
        }
        viewMountInfo.cleanStack()
    }, [])

    useEffect(() => {
        const setViewBackup = viewBackupStateRef.current[1]

        if (viewMountInfo.mountOrder.has(viewKey)) {
            throw new Error(`ViewBackup error view already mounted. ${viewKey}`)
        }
        viewMountInfo.mountOrder.add(viewKey)  // registers mounting
        debugger;
        return () => {
            if (!viewMountInfo.mountOrder.has(viewKey)) {
                throw new Error(`ViewBackup error view already unmounted. ${viewKey}`)
            }
            /*
            if (viewMountInfo.viewKey === viewKey) {
                debugger;
                viewMountInfo.updateLastViewKey()
            }
            */
            viewMountInfo.mountOrder.remove(viewKey)  // registers unmounting
            debugger;
            // eslint-disable-next-line react-hooks/exhaustive-deps
            if (Object.keys(viewBackupRef.current).length > 0) {  // if has something to save
                debugger;
                // eslint-disable-next-line react-hooks/exhaustive-deps
                setViewBackup(prev => ({ ...prev, [viewKey]: viewBackupRef.current }))  // save state
            }
        }
    }, [viewKey])

    useEffect(() => {
        const setViewBackup = viewBackupStateRef.current[1]

        return () => {
            debugger;
            if (viewMountInfo.direction === 'forward') {
                if (viewMountInfo.mountOrder.lastElement == null) {

                }
            } else if (viewMountInfo.direction === 'backward') {
                if (viewMountInfo.mountOrder.lastElement == null) {

                }
            } else {
                /*
                if (viewMountInfo.allUnmounted(viewMountInfo.backwardViewKey)) {
                    debugger;
                    viewMountInfo.cleanStack()
                }
                */
            }
        }
    }, [viewKey])

    return [viewBackupStateRef.current[0][viewKey], viewBackupRef]
}
