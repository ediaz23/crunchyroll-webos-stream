
import { useSetRecoilState } from 'recoil'

import { pathState, playContentState, selectedContentState, homePositionState } from '../recoilConfig'

import back from '../back'


export function useSetContent() {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Function} */
    const setPlayContent = useSetRecoilState(playContentState)
    /** @type {Function} */
    const setSelectedContent = useSetRecoilState(selectedContentState)
    /** @type {Function} */
    const setHomePosition = useSetRecoilState(homePositionState)

    /**
     * @param {Object} obj
     * @param {Object} obj.content
     * @param {Number} obj.rowIndex
     * @param {Number} obj.columnIndex
     */
    return ({ content, rowIndex, columnIndex }) => {
        back.pushHistory({
            doBack: () => {
                setPath('/profiles/home')
            }
        })
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
        setHomePosition({ rowIndex, columnIndex })
    }
}