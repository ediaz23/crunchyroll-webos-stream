
import { useCallback, useEffect, useRef } from 'react'
import Spinner from '@enact/moonstone/Spinner'
import { VirtualGridList } from '@enact/moonstone/VirtualList'
import GridListImageItem from '@enact/moonstone/GridListImageItem'
import ri from '@enact/ui/resolution'

import PropTypes from 'prop-types'

import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import { useSetContent } from '../../hooks/setContentHook'


/**
 * Show grid of items
 * @param {{
    contentList: Array<Object>,
    load: Function,
    autoScroll: Boolean,
    onScroll: Function,
 }}
 */
const ContentGridItems = ({ contentList, load, autoScroll, onScroll, ...rest }) => {
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {Number} */
    const itemHeight = ri.scale(390)
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {Function} */
    const setContent = useSetContent()

    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])

    const onSelectItem = useCallback((ev) => {
        if (ev.currentTarget) {
            const content = contentList[parseInt(ev.currentTarget.dataset['index'])]
            setContent(content)
        }
    }, [contentList, setContent])

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
            if (load) {
                Promise.resolve().then(() => load(index))
            }
            out = (
                <div {...rest2} >
                    <Spinner />
                </div>
            )
        }
        return out
    }, [contentList, itemHeight, getImagePerResolution, onSelectItem, load])

    useEffect(() => {
        if (contentList.length > 0 && autoScroll && scrollToRef.current) {
            scrollToRef.current({ index: 0, animate: false, focus: true })
            onScroll()
        }
    }, [contentList, autoScroll, onScroll])

    return (
        <VirtualGridList {...rest}
            dataSize={contentList.length}
            itemRenderer={renderItem}
            itemSize={{ minHeight: itemHeight, minWidth: ri.scale(240) }}
            spacing={ri.scale(25)}
            cbScrollTo={getScrollTo}
        />
    )
}

ContentGridItems.propTypes = {
    contentList: PropTypes.arrayOf(PropTypes.object).isRequired,
    autoScroll: PropTypes.bool.isRequired,
    onScroll: PropTypes.func.isRequired,
    load: PropTypes.func,
}

export default ContentGridItems
