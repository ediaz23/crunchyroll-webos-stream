
import { useEffect, useRef } from 'react'
import { useRecoilState } from 'recoil'

import { playContentState } from '../recoilConfig'

/**
 * @param {Array} videos
 * @param {Function} setVideoIndex
 * @returns {{current: Object}}
 */
export const useBackVideoIndex = (videos, setVideoIndex) => {

    /** @type {[Object, Function]} */
    const [playContent, setPlayContent] = useRecoilState(playContentState)
    /** @type {{current: Object}} */
    const playContentRef = useRef(playContent)

    useEffect(() => {
        if (videos != null && videos.length) {
            if (playContentRef.current != null) {
                const index = videos.findIndex(v => v.id === playContentRef.current.id)
                setVideoIndex(Math.max(0, index))
                playContentRef.current = null
            } else {
                setVideoIndex(0)
            }
        }
    }, [videos, setVideoIndex])

    useEffect(() => {
        setPlayContent(null)
    }, [setPlayContent])

    return playContentRef
}
