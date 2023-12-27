
import { useCallback, useState, useEffect } from 'react'
import { Cell, Column } from '@enact/ui/Layout'
import Spinner from '@enact/moonstone/Spinner'
import { VirtualGridList } from '@enact/moonstone/VirtualList'
import GridListImageItem from '@enact/moonstone/GridListImageItem'
import ri from '@enact/ui/resolution'

import PropTypes from 'prop-types'
import { useRecoilState } from 'recoil'

import { selectedContentState, } from '../../recoilConfig'
import HomeContentBanner from '../home/ContentBanner'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import { useSetContent } from '../../hooks/setContentHook'
import api from '../../api'


/**
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
    /** @type {[Array<Object>, Function]} */
    const [watchlist, setWatchlist] = useState([])
    /** @type {[Object, Function]} */
    const [loading, setLoading] = useState({})
    /** @type {[Object, Function]} */
    const [selectedContent, setSelectedContent] = useRecoilState(selectedContentState)
    /** @type {Function} */
    const setContent = useSetContent()
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {Number} */
    const itemHeight = ri.scale(270)
    /** @type {Number} */
    const itemWidth = ri.scale(240)
    /** @type {Number} */
    const quantity = 100

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

    /**
     * @todo falta el auto scroll
     */
    const renderItem = useCallback(({ index, ...rest2 }) => {
        let out
        const contentItem = watchlist[index]
        if (contentItem) {
            const image = getImagePerResolution({
                wowidth: itemWidth,
                content: contentItem,
                mode: 'wide'
            })

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
                    if (loading[index] === undefined) {
                        setLoading(prev => { prev[index] = false; return { ...prev } })
                        const res = await api.discover.getWatchlist(profile, { quantity, start: index })
                        const res2 = await processResult({ profile, data: res.data })
                        setWatchlist(prevArray => [
                            ...prevArray.slice(0, index),
                            ...res2.data,
                            ...watchlist.slice(index + res2.data.length)
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
        onClickItem, onSelectItem, loading, setLoading])

    useEffect(() => {
        api.discover.getWatchlist(profile, { quantity }).then(async res => {
            const res2 = await processResult({ profile, data: res.data })
            setWatchlist([...res2.data, ...new Array(res.total - res.data.length)])
        })
    }, [profile])

    return (
        <Column {...rest}>
            <Cell size="50%">
                {selectedContent && <HomeContentBanner content={selectedContent} />}
            </Cell>
            <Cell grow>
                <VirtualGridList {...rest}
                    dataSize={watchlist.length}
                    itemRenderer={renderItem}
                    itemSize={{ minHeight: itemHeight, minWidth: itemWidth }}
                    spacing={ri.scale(25)}
                />
            </Cell>
        </Column>
    )
}

Watchlist.propTypes = {
    profile: PropTypes.object.isRequired,
}

export default Watchlist
