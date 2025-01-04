
import { useSetRecoilState } from 'recoil'

import {
    pathState, playContentState, selectedContentState,
    homePositionState, contentDetailBakState
} from '../recoilConfig'

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
    /** @type {Function} */
    const setContentDetailBak = useSetRecoilState(contentDetailBakState)

    /**
     * @param {Object} obj
     * @param {Object} obj.content
     * @param {Number} obj.rowIndex
     * @param {Number} obj.columnIndex
     * @param {String} [obj.backPath]
     * @param {String} [obj.contentBak]
     */
    return ({ content, rowIndex, columnIndex, backPath = '/profiles/home', contentBak = {} }) => {
        back.pushHistory({
            doBack: () => {
                setPath(backPath)
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
            setContentDetailBak(contentBak)
            setPath('/profiles/home/content')
        }
        setHomePosition({ rowIndex, columnIndex })
    }
}