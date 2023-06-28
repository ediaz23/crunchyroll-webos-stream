
import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import ri from '@enact/ui/resolution'
import VirtualListNested from '../patch/VirtualListNested'
import Heading from '@enact/moonstone/Heading'
import Image from '@enact/moonstone/Image'
import PropTypes from 'prop-types'

import useGetImagePerResolution from '../hooks/getImagePerResolution'
import Navigable from '../wrappers/Navigable'
import css from './HomeFeedRow.module.less'

const NavigableDiv = Navigable('div', '')


const Poster = ({ title, image, itemSize, ...rest }) => {
    rest.style.width = itemSize
    return (
        <NavigableDiv {...rest}>
            <Image src={image.source}
                sizing='none' style={image.size} />
            <Heading size="small">
                {title}
            </Heading>
        </NavigableDiv >
    )
}

const HomeFeedItem = ({ feed, index, itemHeight, ...rest }) => {
    const feedItem = feed.items[index]
    const getImagePerResolution = useGetImagePerResolution()
    const margin = ri.scale(20)
    const image = getImagePerResolution({ height: itemHeight, width: rest.itemSize - margin, content: feedItem })
    return (
        <Poster
            title={feedItem.title}
            image={image}
            {...rest}
        />
    )
}

const HomeFeedRow = ({ feed, itemSize, cellId, setContent, style, className, index, ...rest }) => {
    /** @type {{current: HTMLElement}} */
    const compRef = useRef(null)
    /** @type {[Number, Function]} */
    const [itemHeight, setItemHeight] = useState(0)
    const itemWidth = ri.scale(320)
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)

    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])
    const selectElement = (ev) => { setContent(feed.items[parseInt(ev.target.dataset.index)]) }
    const childProps = { id: cellId, feed, itemSize: itemWidth, onFocus: selectElement, itemHeight }

    const newStyle = useMemo(() => Object.assign({}, style, { height: itemSize, }), [style, itemSize])
    const newClassName = useMemo(() => `${className} ${css.homeFeedRow}`, [className])

    useEffect(() => {
        if (compRef && compRef.current) {
            const boundingRect = compRef.current.getBoundingClientRect()
            setItemHeight(itemSize - boundingRect.height * 2)
        }
    }, [compRef, itemSize])


    useEffect(() => {
        if (index === 0) {
            const interval = setInterval(() => {
                if (scrollToRef.current) {
                    scrollToRef.current({ index: 0, animate: false, focus: true })
                    clearInterval(interval)
                }
            }, 300)
            return () => clearInterval(interval)
        }
    }, [])  // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className={newClassName} style={newStyle} {...rest}>
            <Heading size="title" spacing="small" componentRef={compRef}>
                {feed.title}
            </Heading>
            <div>
                {itemHeight > 0 &&
                    <VirtualListNested
                        dataSize={feed.items.length}
                        itemRenderer={HomeFeedItem}
                        itemSize={itemWidth}
                        childProps={childProps}
                        direction='horizontal'
                        verticalScrollbar='hidden'
                        horizontalScrollbar='hidden'
                        noScrollByWheel
                        cbScrollTo={getScrollTo}
                    />
                }
            </div>
        </div>
    )
}

HomeFeedRow.propTypes = {
    feed: PropTypes.object.isRequired,
    itemSize: PropTypes.number.isRequired,
    cellId: PropTypes.string.isRequired,
    setContent: PropTypes.func.isRequired,
}

export default HomeFeedRow
