
import { useState, useEffect, useCallback } from 'react'
import { Row, Cell } from '@enact/ui/Layout'

import PropTypes from 'prop-types'

import { ContentHeader } from '../home/ContentBanner'
import SeasonsList from './SeasonsList'
import EpisodesList from './EpisodesList'
import api from '../../api'


/**
 * Caculate playhead progress
 * @param {{
    profile: import('crunchyroll-js-api/src/types').Profile,
    episodesData: Array<Object>,
 }}
 */
async function calculatePlayheadProgress({ profile, episodesData }) {
    const epIds = episodesData.map(e => e.id)
    const { data: data2 } = await api.content.getPlayHeads(profile, { contentIds: epIds })
    const playheads = data2.reduce((total, value) => {
        total[value.content_id] = value
        return total
    }, {})
    for (const ep of episodesData) {
        if (playheads[ep.id]) {
            const duration = ep.duration_ms / 1000
            ep.playhead = {
                ...playheads[ep.id],
                progress: playheads[ep.id].playhead / duration * 100
            }
        } else {
            ep.playhead = {
                playhead: 0,
                fully_watched: false,
                progress: 0,
            }
        }
    }
}


/**
 * @param {{
    profile: import('crunchyroll-js-api/src/types').Profile,
    series: Object,
 }}
 */
const Seasons = ({ profile, series, ...rest }) => {
    /** @type {[Array<Object>, Function]} */
    const [seasons, setSeasons] = useState([])
    /** @type {[Object, Function]} */
    const [season, setSeason] = useState({})
    /** @type {[Array<Object>, Function]} */
    const [episodes, setEpisodes] = useState([])

    /** @type {Function} */
    const selectSeason = useCallback(({ target }) => {
        setSeason(seasons[parseInt(target.dataset.index)])
    }, [seasons, setSeason])

    const selectEpisode = useCallback(({ target }) => {
        console.log(episodes[parseInt(target.dataset.index)])
    }, [episodes])

    useEffect(() => {
        api.cms.getSeasons(profile, { serieId: series.id }).then(({ data }) => {
            data.forEach(e => { e.episodes = [] })
            setSeason(data[0])
            setSeasons(data)
        })
    }, [profile, series, setSeason])

    useEffect(() => {
        const loadData = async () => {
            if (season.episodes.length) {
                setEpisodes(season.episodes)
            } else {
                const { data: episodesData } = await api.cms.getEpisodes(profile, { seasonId: season.id })
                await calculatePlayheadProgress({ profile, episodesData })
                season.episodes = episodesData
                setEpisodes(episodesData)
            }
        }
        if (season.id) {
            loadData()
        }
    }, [profile, season])

    return (
        <Row align='start space-between' {...rest}>
            <Cell size="49%">
                <ContentHeader content={series} />
                <SeasonsList seasons={seasons} selectSeason={selectSeason} />
            </Cell>
            <Cell size="49%">
                <EpisodesList episodes={episodes} selectEpisode={selectEpisode} />
            </Cell>
        </Row>
    )
}

Seasons.propTypes = {
    profile: PropTypes.object.isRequired,
    series: PropTypes.object.isRequired,
}

export default Seasons
