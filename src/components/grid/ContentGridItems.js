
import { useCallback, useEffect, useRef, useMemo } from 'react'
import { Row } from '@enact/ui/Layout'
import Spinner from '@enact/moonstone/Spinner'
import { VirtualGridList } from '@enact/moonstone/VirtualList'
import GridListImageItem from '@enact/moonstone/GridListImageItem'
import ri from '@enact/ui/resolution'
import { useRecoilValue } from 'recoil'

import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import { homePositionState } from '../../recoilConfig'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import { useSetContent } from '../../hooks/setContent'
import scrollCss from '../../patch/Scroller.module.less'


/**
 * Show grid of items
 * @param {Object} obj
 * @param {Array<Object>} obj.contentList
 * @param {Function} [obj.load]
 * @param {Boolean} [obj.autoScroll]
 * @param {Function} [obj.onFocus]
 * @param {'tall'|'wide'} [obj.mode]
 * @param {Function} obj.onLeave
 */
const ContentGridItems = ({ contentList, load, autoScroll = true, onFocus, mode = 'tall', onLeave, ...rest }) => {
    /** @type {{rowIndex: Number, columnIndex: Number}} */
    const homePosition = useRecoilValue(homePositionState)
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
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

    const onSelectItem = useCallback((ev) => {
        if (ev.currentTarget) {
            const index = parseInt(ev.currentTarget.dataset['index'])
            setContentNavagate({ content: contentList[index], rowIndex: index })
            onLeave()
        }
    }, [contentList, setContentNavagate, onLeave])

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
        const interval = setInterval(() => {
            if (autoScroll) {
                if (scrollToRef.current) {
                    clearInterval(interval)
                    scrollToRef.current({ index: homePosition.rowIndex, animate: false, focus: true })
                }
            } else {
                clearInterval(interval)
            }
        }, 100)
        return () => clearInterval(interval)
    }, [autoScroll, homePosition.rowIndex])

    return (
        <div className={scrollCss.scrollerFix}>
            {contentList.length ?
                <VirtualGridList {...rest}
                    dataSize={contentList.length}
                    itemRenderer={renderItem}
                    itemSize={{ minHeight: itemHeight, minWidth: itemWidth }}
                    spacing={ri.scale(25)}
                    cbScrollTo={getScrollTo}
                />
                :
                <Row align='center center' {...rest}>
                    <h1>{$L('Empty')}</h1>
                </Row>
            }
        </div>
    )
}

ContentGridItems.propTypes = {
    contentList: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.object, PropTypes.bool])).isRequired,
    onLeave: PropTypes.func.isRequired,
    autoScroll: PropTypes.bool,
    mode: PropTypes.oneOf(['tall', 'wide']),
    load: PropTypes.func,
    onFocus: PropTypes.func,
}

export default ContentGridItems
