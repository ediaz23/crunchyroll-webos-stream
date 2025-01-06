
import { useCallback } from 'react'
import { useRecoilValue } from 'recoil'
import { isPremiumState } from '../recoilConfig'
import { getIsPremium } from '../utils'

/**
 * @returns {Function}
 */
export const useProcessMusicVideos = () => {

    /** @type {Boolean} */
    const isPremium = useRecoilValue(isPremiumState)

    /** @type {Function} */
    const processVideos = useCallback(({ data }, videoList) => {
        data.forEach(ep => {
            ep.playhead = { progress: 0 }
            ep.showPremium = !isPremium && getIsPremium(ep)
            ep.videos = videoList
            let chunks = []
            if (ep.originalRelease) {
                chunks.push((new Date(ep.originalRelease)).getFullYear())
            }
            if (ep.genres && ep.genres.length) {
                chunks.push(ep.genres.map(e => e.displayValue).join(', '))
            }
            if (chunks.length && !ep.description) {
                ep.description = chunks.join('\n')
            }
        })
        data.sort((a, b) => {
            const dateA = a.originalRelease ? new Date(a.originalRelease) : new Date();
            const dateB = b.originalRelease ? new Date(b.originalRelease) : new Date();
            return dateB - dateA;
        })
        return data
    }, [isPremium])
    return processVideos
}
