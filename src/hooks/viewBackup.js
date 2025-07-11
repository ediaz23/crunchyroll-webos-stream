
import { useRef, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { viewBackupState } from '../recoilConfig'


/**
 * @param {String} viewKey
 * @return {[Object, import('react').MutableRefObject<Object>]}
 */
export function useViewBackup(viewKey) {
    const viewBackupStateRef = useRef(useRecoilState(viewBackupState))
    const viewBackupRef = useRef({})

    useEffect(() => {
        const setViewBackup = viewBackupStateRef.current[1]
        return () => {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            if (Object.keys(viewBackupRef.current)) {  // some componet need to share same key
                // eslint-disable-next-line react-hooks/exhaustive-deps
                setViewBackup(prev => ({ ...prev, [viewKey]: viewBackupRef.current }));
            }
        }
    }, [viewKey])

    return [viewBackupStateRef.current[0][viewKey], viewBackupRef]
}
