
import { useCallback } from 'react'
import Spinner from '@enact/moonstone/Spinner'
import { VirtualGridList } from '@enact/moonstone/VirtualList'
import GridListImageItem from '@enact/moonstone/GridListImageItem'
import ri from '@enact/ui/resolution'

import PropTypes from 'prop-types'
import { useSetRecoilState } from 'recoil'

import { selectedContentState, pathState } from '../../recoilConfig'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import api from '../../api'
import back from '../../back'


/**
 * Show grid of items
 * @param {{
    profile: Object,
    contentList: Array<Object>,
    setContentList: Function,
    options: Object,
 }}
 */
const ContentGridItems = ({ profile, contentList, setContentList, options, ...rest }) => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Function} */
    const setSelectedContent = useSetRecoilState(selectedContentState)
    const itemHeight = ri.scale(390)
    const getImagePerResolution = useGetImagePerResolution()

    const onSelectItem = useCallback((ev) => {
        if (ev.currentTarget) {
            const content = contentList[parseInt(ev.currentTarget.dataset['index'])]
            if (content.type === 'series') {
                back.pushHistory({
                    doBack: () => {
                        setSelectedContent(null)
                        setPath('/profiles/home')
                    }
                })
                setSelectedContent(content)
                setPath('/profiles/home/content')
            }
        }
    }, [contentList, setPath, setSelectedContent])

    /**
     * @todo falta seleccionar el contenido
     *   falta el auto scroll
     */
    const renderItem = useCallback(({ index, ...rest2 }) => {
        let out
        const contentItem = contentList[index]
        if (contentItem) {
            const image = getImagePerResolution({
                height: itemHeight,
                content: contentItem,
                mode: 'tall'
            })
            out = (
                <GridListImageItem
                    {...rest2}
                    data-index={index}
                    source={image.source}
                    caption={(contentItem.title || '').replace(/\n/g, "")}
                    subCaption={(contentItem.description || '').replace(/\n/g, "")}
                    onClick={onSelectItem}
                />
            )
        } else {
            if (index % options.quantity === 0) {
                api.discover.getBrowseAll(profile, { ...options, start: index })
                    .then(res => setContentList(prevArray => [
                        ...prevArray.slice(0, index),
                        ...res.data,
                    ]))
            }
            out = (
                <div {...rest2} >
                    <Spinner />
                </div>
            )
        }
        return out
    }, [profile, contentList, options, itemHeight, getImagePerResolution, setContentList, onSelectItem])

    return (
        <VirtualGridList {...rest}
            dataSize={contentList.length}
            itemRenderer={renderItem}
            itemSize={{ minHeight: itemHeight, minWidth: ri.scale(240) }}
            spacing={ri.scale(25)}
        />
    )
}

ContentGridItems.propTypes = {
    profile: PropTypes.object.isRequired,
    contentList: PropTypes.arrayOf(PropTypes.object).isRequired,
    setContentList: PropTypes.func.isRequired,
    options: PropTypes.object.isRequired,
}

export default ContentGridItems