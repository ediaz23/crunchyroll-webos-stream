
import { useCallback, useState, useEffect } from 'react'
import { Cell, Column } from '@enact/ui/Layout'
import Spinner from '@enact/moonstone/Spinner'

import PropTypes from 'prop-types'
import { useSetRecoilState } from 'recoil'

import { homeViewReadyState } from '../../recoilConfig'
import HomeContentBanner from '../home/ContentBanner'
import ContentGridItems from '../grid/ContentGridItems'
import api from '../../api'
import useMergeContentList from '../../hooks/mergeContentList'


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
    const [contentList, setContentList] = useState([])
    /** @type {[Boolean, Function]} */
    const [autoScroll, setAutoScroll] = useState(true)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)
    /** @type {[Object, Function]} */
    const [selectedContent, setSelectedContent] = useState(null)
    /** @type {Number} */
    const quantity = 100

    const onSelectItem = useCallback((ev) => {
        if (ev.currentTarget) {
            const content = contentList[parseInt(ev.currentTarget.dataset['index'])]
            setSelectedContent(content)
        }
    }, [contentList, setSelectedContent])

    const onScroll = useCallback(() => setAutoScroll(false), [])

    const mergeContentList = useMergeContentList(setContentList, quantity)

    const onLoad = useCallback((index) => {
        if (contentList[index] === undefined) {
            mergeContentList(false, index)
            api.discover.getWatchlist(profile, { quantity, start: index }).then(res =>
                processResult({ profile, data: res.data }).then(res2 => {
                    mergeContentList(res2.data, index)
                })
            )

        }
    }, [profile, contentList, mergeContentList])

    const changeContentList = useCallback((newList) => {
        setContentList(newList)
        setLoading(false)
        setHomeViewReady(true)
        setAutoScroll(true)
    }, [setContentList, setLoading, setHomeViewReady, setAutoScroll])

    useEffect(() => {
        setLoading(true)
        api.discover.getWatchlist(profile, { quantity }).then(res =>
            processResult({ profile, data: res.data }).then(res2 => {
                changeContentList([...res2.data, ...new Array(res.total - res.data.length)])
            })
        )
    }, [profile, setLoading, changeContentList])

    return (
        <Column {...rest}>
            {loading &&
                <Column align='center center'>
                    <Spinner />
                </Column>
            }
            {!loading &&
                <Column>
                    <Cell size="50%">
                        {selectedContent && <HomeContentBanner content={selectedContent} />}
                    </Cell>
                    <Cell grow>
                        <ContentGridItems
                            contentList={contentList}
                            load={onLoad}
                            autoScroll={autoScroll}
                            onScroll={onScroll}
                            onFocus={onSelectItem}
                            mode='wide' />
                    </Cell>
                </Column>
            }
        </Column>
    )
}

Watchlist.propTypes = {
    profile: PropTypes.object.isRequired,
}

export default Watchlist
