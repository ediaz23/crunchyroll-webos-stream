
import { useCallback, useState, useEffect, useMemo } from 'react'
import { Cell, Column } from '@enact/ui/Layout'
import Spinner from '@enact/moonstone/Spinner'

import PropTypes from 'prop-types'

import HomeContentBanner from '../home/ContentBanner'
import ContentGridItems from '../grid/ContentGridItems'
import api from '../../api'
import useContentList from '../../hooks/contentList'


/**
 * @bug assume only are episdes and movies
 * @returns {Promise<{total: Number, data: Array}>}
 */
const processResult = async ({ profile, data }) => {
    /** @type {Array} */
    const contentIds = data.map(item => {
        let out = item.id
        if (item.type === 'episode') {
            out = item.episode_metadata.series_id || out
        } else if (item.type === 'movie') {
            out = item.movie_metadata.movie_listing_id || out
        }
        return out
    })
    let res = { total: 0, data: [] }
    if (contentIds.length) {
        res = await api.cms.getObjects(profile, { objectIds: contentIds, ratings: true })
    }
    return res
}

/**
 * Watch list view
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile current profile
 */
const Watchlist = ({ profile, ...rest }) => {

    const { contentList, quantity, autoScroll, delay,
        mergeContentList, changeContentList, onLeave, onFilter,
        contentListBak,
        loading, setLoading,
    } = useContentList('watchlist')

    /** @type {[Object, Function]} */
    const [selectedContent, setSelectedContent] = useState(null)

    /** @type {import('../grid/ContentGrid').SearchOptions} */
    const options = useMemo(() => {
        return { quantity }
    }, [quantity])

    /** @type {Function} */
    const onSelectItem = useCallback((ev) => {
        if (ev.currentTarget) {
            const content = contentList[parseInt(ev.currentTarget.dataset['index'])]
            setSelectedContent(content)
        }
    }, [contentList, setSelectedContent])

    /** @type {Function} */
    const onLoad = useCallback((index) => {
        if (mergeContentList(false, index)) {
            api.discover.getWatchlist(profile, { ...options, start: index })
                .then(res =>
                    processResult({ profile, data: res.data }).then(res2 =>
                        mergeContentList(res2.data, index)
                    )
                )
        }
    }, [profile, mergeContentList, options])

    /** @type {Function} */
    const onLeaveView = useCallback(() => {
        onLeave(null)
    }, [onLeave])

    useEffect(() => {
        if (delay >= 0) {
            setLoading(true)
            api.discover.getWatchlist(profile, options).then(res =>
                processResult({ profile, data: res.data }).then(res2 => {
                    changeContentList([...res2.data, ...new Array(res.total - res.data.length)])
                })
            )
        }
    }, [profile, changeContentList, options, setLoading, delay])

    useEffect(() => {  // initializing
        if (contentListBak) {
            changeContentList(contentListBak)
        } else {
            onFilter({ delay: 0, scroll: true })
        }
    }, [profile, contentListBak, changeContentList, onFilter])

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
                            onLeave={onLeaveView}
                            autoScroll={autoScroll}
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
