
import { useCallback, useState } from 'react'
import Spinner from '@enact/moonstone/Spinner'
import { VirtualGridList } from '@enact/moonstone/VirtualList'
import GridListImageItem from '@enact/moonstone/GridListImageItem'
import ri from '@enact/ui/resolution'

import PropTypes from 'prop-types'

import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import { useSetContent } from '../../hooks/setContentHook'
import api from '../../api'


/**
 * Show grid of items
 * @param {{
    profile: Object,
    contentList: Array<Object>,
    setContentList: Function,
    options: Object,
 }}
 */
const ContentGridItems = ({ profile, contentList, setContentList, options, engine, ...rest }) => {
    /** @type {[Object, Function]} */
    const [loading, setLoading] = useState({})
    const itemHeight = ri.scale(390)
    const getImagePerResolution = useGetImagePerResolution()
    const setContent = useSetContent()

    const onSelectItem = useCallback((ev) => {
        if (ev.currentTarget) {
            const content = contentList[parseInt(ev.currentTarget.dataset['index'])]
            setContent(content)
        }
    }, [contentList, setContent])

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
                Promise.resolve().then(() => {
                    if (loading[index] === undefined) {
                        setLoading(prev => { prev[index] = false; return { ...prev } })
                        if (engine === 'search') {
                            api.discover.search(profile, { ...options, start: index })
                                .then(res => setContentList(prevArray => [
                                    ...prevArray.slice(0, index),
                                    ...res.data[0].items,
                                    ...contentList.slice(index + res.data[0].items.length)
                                ]))
                        } else {
                            api.discover.getBrowseAll(profile, { ...options, start: index })
                                .then(res => setContentList(prevArray => [
                                    ...prevArray.slice(0, index),
                                    ...res.data,
                                    ...contentList.slice(index + res.data[0].items.length),
                                ]))
                        }
                    }
                })
            }
            out = (
                <div {...rest2} >
                    <Spinner />
                </div>
            )
        }
        return out
    }, [profile, contentList, options, itemHeight, getImagePerResolution,
        setContentList, onSelectItem, engine, loading, setLoading])

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
    engine: PropTypes.string.isRequired
}

export default ContentGridItems
