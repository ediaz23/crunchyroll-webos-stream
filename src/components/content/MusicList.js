
import { useEffect, useCallback, useState, useMemo } from 'react'
import PropTypes from 'prop-types'

import EpisodesList from './EpisodesList'
import { useProcessMusicVideos } from '../../hooks/processMusicVideos'
import { useBackVideoIndex } from '../../hooks/backVideoIndex'
import api from '../../api'


/**
 * MusicList
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile current profile
 * @param {[Object, Function]} obj.contentState
 * @param {Function} obj.onLoadData
 */
const MusicList = ({ profile, contentState, onLoadData }) => {
    const [content, setContent] = contentState
    /** @type {[Array<Object>, Function]} */
    const [videos, setVideos] = useState(null)
    /** @type {[Number, Function]} */
    const [videoIndex, setVideoIndex] = useState(null)
    const cacheKey = useMemo(() => (
        content != null ? `options-music/${content.id}` : null
    ), [content])
    /** @type {Function} */
    const processVideos = useProcessMusicVideos()

    /** @type {Function} */
    const playMusicContent = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const index = parseInt(target.dataset.index)
        setContent(videos[index])
    }, [videos, setContent])

    useBackVideoIndex(videos, setVideoIndex)

    useEffect(() => {
        const loadVideos = async () => {
            const cacheVideos = await api.utils.getCustomCache(cacheKey)
            if (cacheVideos) {
                setVideos(cacheVideos)
                onLoadData({ total: cacheVideos.length })
            } else {
                /** @fixme usume total is same as music.length */
                const { data: music } = await api.music.getFeatured(profile, {
                    contentId: content.id,
                    ratings: true
                })
                processVideos(music)
                await api.utils.saveCustomCache(cacheKey, music)
                setVideos(music)
                onLoadData({ total: music.length })
            }
        }
        loadVideos()
    }, [profile, content, onLoadData, processVideos, setVideos, cacheKey])

    return (
        <EpisodesList
            key={`options-music-${content.id}`}
            episodes={videos}
            episodeIndex={videoIndex}
            selectEpisode={playMusicContent} />
    )
}

MusicList.propTypes = {
    profile: PropTypes.object.isRequired,
    contentState: PropTypes.arrayOf(
        PropTypes.oneOfType([
            PropTypes.object, PropTypes.func
        ])
    ).isRequired,
    onLoadData: PropTypes.func.isRequired,
}

export default MusicList
