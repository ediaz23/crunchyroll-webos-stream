
import { useCallback } from 'react'
import PropTypes from 'prop-types'

import ContentListPoster from '../ContentListPoster'
import api from '../../api'


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
    /** @type {Function} */
    const loadData = useCallback(async options => {
        const res = await api.discover.getWatchlist(profile, options)
        const { data } = await processResult({ profile, ...res })
        return { ...res, data }

    }, [profile])

    return (
        <ContentListPoster
            profile={profile}
            loadData={loadData}
            type='watchlist'
            noPoster={api.config.getAppConfig().ui === 'lite'}
            {...rest}
        />
    )
}

Watchlist.propTypes = {
    profile: PropTypes.object.isRequired,
}

export default Watchlist
