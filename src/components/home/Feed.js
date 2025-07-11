
import { useCallback, useEffect, useRef, useMemo, useState } from 'react'
import { Column, Cell } from '@enact/ui/Layout'
import ri from '@enact/ui/resolution'
import PropTypes from 'prop-types'

import HomeContentBanner from './ContentBanner'
import HomeFeedRow from './FeedRow'
import VirtualListNested from '../../patch/VirtualListNested'
import { getFakeFeedItem } from '../../hooks/homefeedWorker'
import { useViewBackup } from '../../hooks/viewBackup'


/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile current profile
 * @param {{id: Number, items: Array<import('../hooks/homefeedWorker').HomefeedItem>}} obj.homeFeed
 * @param {'home'|'music'} obj.feedType
 */
const HomeFeed = ({ profile, homeFeed, feedType, ...rest2 }) => {
    const [backState, viewBackupRef] = useViewBackup(`homeFeed-${feedType}-${homeFeed.id}`)
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {{current: Number}} */
    const rowIndexRef = useRef(backState?.rowIndex || 0)
    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])
    /** @type {[Object, Function]} */
    const [selectedContent, setSelectedContent] = useState(null)
    /** @type {Number} */
    const itemHeigth = ri.scale(270)
    /** @type {Object} */
    const fakeItem = useMemo(getFakeFeedItem, [])

    /** @type {Function} */
    const renderRow = useCallback(({ index, ...rest }) => (
        <HomeFeedRow feedRow={homeFeed.items[index]} {...rest} />
    ), [homeFeed])

    /** @type {Function} */
    const setContent = useCallback((content, rowIndex) => {
        viewBackupRef.current = { rowIndex }
        setSelectedContent(content)
    }, [viewBackupRef, setSelectedContent])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current) {
                clearInterval(interval)
                scrollToRef.current({ index: rowIndexRef.current, animate: false, focus: false })
            }
        }, 100)
        return () => clearInterval(interval)
    }, [])

    return (
        <Column style={{ paddingLeft: '0.5rem' }} {...rest2}>
            <Cell size="47%">
                {selectedContent && <HomeContentBanner content={selectedContent} noCategory />}
            </Cell>
            <Cell>
                <VirtualListNested
                    dataSize={homeFeed.items.length}
                    itemRenderer={renderRow}
                    itemSize={itemHeigth}
                    childProps={{
                        profile,
                        id: 'rowFeed',
                        cellId: 'cellFeed',
                        itemSize: itemHeigth,
                        rowInfo: {
                            feedId: homeFeed.id,
                            feedType,
                            fakeItem,
                            setContent,
                        }
                    }}
                    direction='vertical'
                    verticalScrollbar='hidden'
                    horizontalScrollbar='hidden'
                    cbScrollTo={getScrollTo}
                />
            </Cell>
        </Column>
    )
}

HomeFeed.propTypes = {
    profile: PropTypes.object.isRequired,
    homeFeed: PropTypes.shape({
        id: PropTypes.number.isRequired,
        items: PropTypes.arrayOf(PropTypes.object).isRequired,
    }).isRequired,
    feedType: PropTypes.oneOf(['home', 'music']),
}

export default HomeFeed
