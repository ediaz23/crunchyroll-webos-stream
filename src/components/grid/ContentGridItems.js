
import { useCallback, useEffect, useRef, useMemo } from 'react'
import Spinner from '@enact/moonstone/Spinner'
import { VirtualGridList } from '@enact/moonstone/VirtualList'
import GridListImageItem from '@enact/moonstone/GridListImageItem'
import ri from '@enact/ui/resolution'
import DateFmt from 'ilib/lib/DateFmt'

import PropTypes from 'prop-types'

import LoadingList from '../LoadingList'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import { useViewBackup } from '../../hooks/viewBackup'
import css from './ContentGrid.module.less'


/**
 * Show grid of items
 * @param {Object} obj
 * @param {String} obj.type
 * @param {Array<Object>} obj.contentList
 * @param {Function} obj.onSelect
 * @param {Function} [obj.load]
 * @param {Boolean} [obj.autoScroll]
 * @param {Function} [obj.onFocus]
 * @param {'tall'|'wide'} [obj.mode]
 * @param {Function} [obj.onLeave]
 */
const ContentGridItems = ({ type, contentList, onSelect, load, autoScroll = true, onFocus, mode = 'tall', ...rest }) => {
    const { viewBackup, viewBackupRef } = useViewBackup(`contentGridItems-${type}`)
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {{current: Number}} */
    const rowIndexRef = useRef(viewBackup?.rowIndex || 0)
    /** @type {[Number, Number]} */
    const [itemHeight, itemWidth] = useMemo(() => {
        return mode === 'tall' ? [ri.scale(390), ri.scale(240)] : [ri.scale(270), ri.scale(320)]
    }, [mode])
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()

    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])

    /** @type {Function} */
    const onSelectItem = useCallback((ev) => {
        if (ev.currentTarget) {
            const rowIndex = parseInt(ev.currentTarget.dataset['index'])
            /** backup all state to restore later */
            viewBackupRef.current = { rowIndex }
            onSelect(contentList[rowIndex])
        }
    }, [contentList, onSelect, viewBackupRef])

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
            const dateFormatter = new DateFmt({ type: 'date', length: 'short' })
            out = (
                <GridListImageItem
                    {...rest2}
                    className={css.GridListImageItemBadge}
                    data-index={index}
                    data-date={contentItem.last_public && dateFormatter.format(new Date(contentItem.last_public))}
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
        let interval = null
        if (autoScroll && rowIndexRef.current !== null) {
            interval = setInterval(() => {
                if (scrollToRef.current && contentList != null) {
                    clearInterval(interval)
                    if (contentList.length > 0) {
                        const index = Math.min(rowIndexRef.current, contentList.length - 1)
                        scrollToRef.current({ index, animate: false, focus: true })
                        rowIndexRef.current = null  // avoid focus on search or loading
                    }
                }
            }, 100)
        }
        return () => {
            clearInterval(interval)
        }
    }, [autoScroll, contentList])

    return (
        <LoadingList
            list={contentList}
            index={rowIndexRef.current}
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
    type: PropTypes.string.isRequired,
    onSelect: PropTypes.func.isRequired,
    contentList: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.object, PropTypes.bool])),
        PropTypes.oneOf([null]),
    ]),
    autoScroll: PropTypes.bool,
    mode: PropTypes.oneOf(['tall', 'wide']),
    load: PropTypes.func,
    onFocus: PropTypes.func,
}

export default ContentGridItems
