
import { useCallback } from 'react'
import Spinner from '@enact/moonstone/Spinner'
import { VirtualGridList } from '@enact/moonstone/VirtualList'
import GridListImageItem from '@enact/moonstone/GridListImageItem'
import ri from '@enact/ui/resolution'

import PropTypes from 'prop-types'

import api from '../../api'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'


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

    const itemHeight = ri.scale(390)
    const getImagePerResolution = useGetImagePerResolution()

    /**
     * @todo falta seleccionar el contenido
     */
    const renderItem = useCallback(({ index, ...rest2 }) => {
        let out
        const contentItem = contentList[index]
        if (contentItem) {
            //                    onClick={selectImageItem}
            const image = getImagePerResolution({
                height: itemHeight,
                content: contentItem,
                mode: 'tall'
            })
            out = (
                <GridListImageItem
                    {...rest2}
                    source={image.source}
                    caption={(contentItem.title || '').replace(/\n/g, "")}
                    subCaption={(contentItem.description || '').replace(/\n/g, "")}
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
    }, [profile, contentList, options, itemHeight, getImagePerResolution, setContentList])

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
