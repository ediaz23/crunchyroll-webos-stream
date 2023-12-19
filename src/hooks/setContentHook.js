
import { useSetRecoilState } from 'recoil'

import { pathState, playContentState, selectedContentState } from '../recoilConfig'

import back from '../back'


export function useSetContent() {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Function} */
    const setPlayContent = useSetRecoilState(playContentState)
    /** @type {Function} */
    const setSelectedContent = useSetRecoilState(selectedContentState)

    return (content) => {
        back.pushHistory({ doBack: () => { setPath('/profiles/home') } })
        if (['episode', 'musicConcert', 'movie', 'musicVideo'].includes(content.type)) {
            if (content.type === 'movie' && content.panel) {
                setPlayContent({ ...content, ...content.panel, panel: null })
            } else {
                setPlayContent(content)
            }
            setPath('/profiles/home/player')
        } else {
            setSelectedContent(content)
            setPath('/profiles/home/content')
        }
    }
}