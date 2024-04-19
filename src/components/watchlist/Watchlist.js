
import { useCallback, useState, useEffect, useRef } from 'react'
import { Cell, Column } from '@enact/ui/Layout'
import Spinner from '@enact/moonstone/Spinner'
import { VirtualGridList } from '@enact/moonstone/VirtualList'
import GridListImageItem from '@enact/moonstone/GridListImageItem'
import ri from '@enact/ui/resolution'

import PropTypes from 'prop-types'
import { useRecoilState, useSetRecoilState } from 'recoil'

import { selectedContentState, homeViewReadyState } from '../../recoilConfig'
import HomeContentBanner from '../home/ContentBanner'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import { useSetContent } from '../../hooks/setContentHook'
import api from '../../api'


/**
 * @bug assume only are episdes and movies
 * @returns {Promise<{total: Number, data: Array}>}
 */
const processResult = async ({ profile, data }) => {
    const contentIds = data.map(item => {
        let out = item.id
        if (item.type === 'episode') {
            out = item.episode_metadata.series_id || out
        } else if (item.type === 'movie') {
            out = item.movie_metadata.movie_listing_id || out
        }
        return out
    })
    return api.cms.getObjects(profile, { objectIds: contentIds, ratings: true })
}


const Watchlist = ({ profile, ...rest }) => {
    /** @type {Function} */
    const setHomeViewReady = useSetRecoilState(homeViewReadyState)
    /** @type {[Array<Object>, Function]} */
    const [watchlist, setWatchlist] = useState([])
    /** @type {[Object, Function]} */
    const [loadingItem, setLoadingItem] = useState({})
    /** @type {[Boolean, Function]} */
    const [autoScroll, setAutoScroll] = useState(true)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {[Object, Function]} */
    const [selectedContent, setSelectedContent] = useRecoilState(selectedContentState)
    /** @type {Function} */
    const setContent = useSetContent()
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {Number} */
    const itemHeight = ri.scale(270)
    /** @type {Number} */
    const itemWidth = ri.scale(320)
    /** @type {Number} */
    const quantity = 100

    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])

    const onClickItem = useCallback((ev) => {
        if (ev.currentTarget) {
            const content = watchlist[parseInt(ev.currentTarget.dataset['index'])]
            setContent(content)
        }
    }, [watchlist, setContent])

    const onSelectItem = useCallback((ev) => {
        if (ev.currentTarget) {
            const content = watchlist[parseInt(ev.currentTarget.dataset['index'])]
            setSelectedContent(content)
        }
    }, [watchlist, setSelectedContent])

    const renderItem = useCallback(({ index, ...rest2 }) => {
        let out
        const contentItem = watchlist[index]
        if (contentItem) {
            const image = getImagePerResolution({ width: itemWidth, content: contentItem, mode: 'wide' })
            out = (
                <GridListImageItem
                    {...rest2}
                    data-index={index}
                    source={image.source}
                    caption={(contentItem.title || '').replace(/\n/g, "")}
                    subCaption={(contentItem.description || '').replace(/\n/g, "")}
                    onClick={onClickItem}
                    onFocus={onSelectItem}
                />
            )
        } else {
            if (index % quantity === 0) {
                Promise.resolve().then(async () => {
                    if (loadingItem[index] === undefined) {
                        setLoadingItem(prev => { prev[index] = false; return { ...prev } })
                        const res = await api.discover.getWatchlist(profile, { quantity, start: index })
                        const res2 = await processResult({ profile, data: res.data })
                        setWatchlist(prevArray => [
                            ...prevArray.slice(0, index),
                            ...res2.data,
                            ...prevArray.slice(index + res2.data.length)
                        ])
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
    }, [profile, watchlist, itemWidth, getImagePerResolution, setWatchlist,
        onClickItem, onSelectItem, loadingItem, setLoadingItem])

    useEffect(() => {
        if (!loading) {
            Promise.resolve().then(() => {
                if (watchlist.length > 0 && autoScroll && scrollToRef.current) {
                    scrollToRef.current({ index: 0, animate: false, focus: true })
                    setAutoScroll(false)
                }
            })
        }
    }, [profile, watchlist, autoScroll, loading])

    useEffect(() => {
        setLoading(true)
        api.discover.getWatchlist(profile, { quantity }).then(async res => {
            const res2 = await processResult({ profile, data: res.data })
            setAutoScroll(true)
            setLoadingItem({})
            setWatchlist([...res2.data, ...new Array(res.total - res.data.length)])
        }).then(() => setLoading(false))
            .then(() => setHomeViewReady(true))
    }, [profile, setAutoScroll, setLoadingItem, setWatchlist, setLoading, setHomeViewReady])

    return (
        <Column {...rest}>
            {loading ?
                <Column align='center center'>
                    <Spinner />
                </Column>
                :
                <>
                    <Cell size="50%">
                        {selectedContent && <HomeContentBanner content={selectedContent} />}
                    </Cell>
                    <Cell grow>
                        <VirtualGridList {...rest}
                            dataSize={watchlist.length}
                            itemRenderer={renderItem}
                            itemSize={{ minHeight: itemHeight, minWidth: itemWidth }}
                            spacing={ri.scale(25)}
                            cbScrollTo={getScrollTo}
                        />
                    </Cell>
                </>
            }
        </Column>
    )
}

Watchlist.propTypes = {
    profile: PropTypes.object.isRequired,
}

export default Watchlist
