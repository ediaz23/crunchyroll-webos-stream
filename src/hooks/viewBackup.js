
import { useRef, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { viewBackupState } from '../recoilConfig'

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
    mountOrder: [],
    unmounted: new Set(),
    viewKeyTrigger: null,
    shouldSaveState: function(viewKey) {
        let shouldSaveState = false

        if (this.viewKeyTrigger != null) {
            /* if all componente are unmounted should save state */
            const index = this.mountOrder.indexOf(this.viewKeyTrigger)
            if (index === -1) { throw new Error(`ViewBackup error view never mounted. ${viewKey}`) }
            const afterKeys = this.mountOrder.slice(index)
            shouldSaveState = afterKeys.every(key => this.unmounted.has(key))
        }
        return shouldSaveState
    },
    cleanStack: function() {
        /* Clears internal tracking */
        this.viewKeyTrigger = null
        const mountOrder = [...this.mountOrder]
        this.mountOrder.length = 0
        for (const mountKey of mountOrder) {
            if (!this.unmounted.has(mountKey)) {
                this.mountOrder.push(mountKey)
            }
        }
        this.unmounted.clear()
        this.saveViewBackup = null
    },
    saveViewBackup: () => { },  // callBack promise in setContent
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

    useEffect(() => {
        const setViewBackup = viewBackupStateRef.current[1]

        if (viewMountInfo.mountOrder.includes(viewKey)) {
            throw new Error(`ViewBackup error view already mounted. ${viewKey}`)
        }
        viewMountInfo.mountOrder.push(viewKey)  // registers mounting
        return () => {
            if (viewMountInfo.unmounted.has(viewKey)) {
                throw new Error(`ViewBackup error view already unmounted. ${viewKey}`)
            }
            viewMountInfo.unmounted.add(viewKey)  // registers unmounting
            // eslint-disable-next-line react-hooks/exhaustive-deps
            if (Object.keys(viewBackupRef.current).length > 0) {  // if has something to save
                // eslint-disable-next-line react-hooks/exhaustive-deps
                setViewBackup(prev => ({ ...prev, [viewKey]: viewBackupRef.current }))  // save state
            }
        }
    }, [viewKey])

    useEffect(() => {
        const setViewBackup = viewBackupStateRef.current[1]

        return () => {
            if (viewMountInfo.shouldSaveState(viewKey)) {  // if all component are unmounted
                let oldViewBackup
                setViewBackup(prev => {  // reset global state and store an snapshot
                    oldViewBackup = prev
                    return {}
                })
                if (viewMountInfo.saveViewBackup) {
                    viewMountInfo.saveViewBackup(oldViewBackup)  // Schedules the back handler.
                }
                viewMountInfo.cleanStack()  // Clears internal tracking to star again
            }
        }
    }, [viewKey])

    return [viewBackupStateRef.current[0][viewKey], viewBackupRef]
}
