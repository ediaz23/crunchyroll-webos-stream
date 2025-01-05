
import { useCallback, useEffect, useRef, useMemo } from 'react'
import Spinner from '@enact/moonstone/Spinner'
import { VirtualGridList } from '@enact/moonstone/VirtualList'
import GridListImageItem from '@enact/moonstone/GridListImageItem'
import ri from '@enact/ui/resolution'
import { useRecoilValue } from 'recoil'

import PropTypes from 'prop-types'

import LoadingList from '../LoadingList'
import { homePositionState } from '../../recoilConfig'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import { useSetContent } from '../../hooks/setContent'


/**
 * Show grid of items
 * @param {Object} obj
 * @param {Array<Object>} obj.contentList
 * @param {Function} [obj.load]
 * @param {Boolean} [obj.autoScroll]
 * @param {Function} [obj.onFocus]
 * @param {'tall'|'wide'} [obj.mode]
 * @param {Function} obj.onLeave
 * @param {Object} obj.homePositionOverride
 */
const ContentGridItems = ({ contentList, load, autoScroll = true, onFocus, mode = 'tall', onLeave, onSelect,
    homePositionOverride, ...rest }) => {
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {{current: Number}} */
    const rowIndexRef = useRef(null)
    /** @type {{rowIndex: Number, columnIndex: Number}} */
    const homePosition = useRecoilValue(homePositionOverride || homePositionState)
    /** @type {[Number, Number]} */
    const [itemHeight, itemWidth] = useMemo(() => {
        return mode === 'tall' ? [ri.scale(390), ri.scale(240)] : [ri.scale(270), ri.scale(320)]
    }, [mode])
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {Function} */
    const setContentNavagate = useSetContent()

    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])

    /** @type {Function} */
    const onSelectItem = useCallback((ev) => {
        if (ev.currentTarget) {
            const index = parseInt(ev.currentTarget.dataset['index'])
            onLeave()  // for first if must be before
            if (onSelect) {
                onSelect({ content: contentList[index], rowIndex: index })
            } else {
                setContentNavagate({ content: contentList[index], rowIndex: index })
            }
        }
    }, [contentList, setContentNavagate, onLeave, onSelect])

    /** @type {Function} */
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
                load(index)
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
        if (contentList != null) {
            if (autoScroll && contentList.length > 0) {
                rowIndexRef.current = Math.min(homePosition.rowIndex, contentList.length - 1)
            } else {
                rowIndexRef.current = false
            }
        }
    }, [autoScroll, homePosition.rowIndex, contentList])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current) {
                if (rowIndexRef.current !== null && rowIndexRef.current !== false) {
                    clearInterval(interval)
                    scrollToRef.current({ index: rowIndexRef.current, animate: false, focus: true })
                } else if (rowIndexRef.current === false) {
                    clearInterval(interval)
                }
            }
        }, 100)
        return () => {
            clearInterval(interval)
            scrollToRef.current = null
        }
    }, [])

    return (
        <LoadingList
            list={contentList}
            index={homePosition.rowIndex}
            scrollFn={scrollToRef.current}>
            {contentList && contentList.length > 0 &&
                <VirtualGridList {...rest}
                    dataSize={contentList.length}
                    itemRenderer={renderItem}
                    itemSize={{ minHeight: itemHeight, minWidth: itemWidth }}
                    spacing={ri.scale(25)}
                    cbScrollTo={getScrollTo}
                />
            }
        </LoadingList>
    )
}

ContentGridItems.propTypes = {
    contentList: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.object, PropTypes.bool])),
        PropTypes.oneOf([null]),
    ]),
    onLeave: PropTypes.func.isRequired,
    autoScroll: PropTypes.bool,
    mode: PropTypes.oneOf(['tall', 'wide']),
    load: PropTypes.func,
    onFocus: PropTypes.func,
    onSelect: PropTypes.func,
    homePositionOverride: PropTypes.any
}

export default ContentGridItems
