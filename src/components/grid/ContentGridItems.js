
import { useCallback, useEffect, useRef, useMemo } from 'react'
import Spinner from '@enact/moonstone/Spinner'
import { VirtualGridList } from '@enact/moonstone/VirtualList'
import GridListImageItem from '@enact/moonstone/GridListImageItem'
import ri from '@enact/ui/resolution'

import PropTypes from 'prop-types'

import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import { useSetContent } from '../../hooks/setContent'


/**
 * Show grid of items
 * @param {{
    contentList: Array<Object>,
    load: Function,
    autoScroll: Boolean,
    onScroll: Function,
    onFocus: Function,
    mode: String,
 }}
 */
const ContentGridItems = ({ contentList, load, autoScroll, onScroll, onFocus, mode, ...rest }) => {
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {[Number, Number]} */
    const [itemHeight, itemWidth] = useMemo(() => {
        return mode === 'tall' ? [ri.scale(390), ri.scale(240)] : [ri.scale(270), ri.scale(320)]
    }, [mode])
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
                mode
            })
            out = (
                <GridListImageItem
                    {...rest2}
                    data-index={index}
                    source={image.source}
                    caption={(contentItem.title || '').replace(/\n/g, "")}
                    subCaption={(contentItem.description || '').replace(/\n/g, "")}
                    onClick={onSelectItem}
                    onFocus={onFocus}
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
    }, [contentList, itemHeight, getImagePerResolution, onSelectItem, onFocus, load, mode])

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
            itemSize={{ minHeight: itemHeight, minWidth: itemWidth }}
            spacing={ri.scale(25)}
            cbScrollTo={getScrollTo}
        />
    )
}

ContentGridItems.propTypes = {
    contentList: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.object, PropTypes.bool])).isRequired,
    autoScroll: PropTypes.bool.isRequired,
    onScroll: PropTypes.func.isRequired,
    mode: PropTypes.oneOf(['tall', 'wide']).isRequired,
    load: PropTypes.func,
    onFocus: PropTypes.func,
}

ContentGridItems.defaultProps = {
    mode: 'tall'
}

export default ContentGridItems
