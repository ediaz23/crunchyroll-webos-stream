
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import BodyText from '@enact/moonstone/BodyText'
import Image from '@enact/moonstone/Image'
import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import { useProcessMusicVideos } from '../../hooks/processMusicVideos'
import { useBackVideoIndex } from '../../hooks/backVideoIndex'
import { useViewBackup } from '../../hooks/viewBackup'
import { useSetContentNavigate } from '../../hooks/setContent'
import Scroller from '../../patch/Scroller'

import { ContentHeader } from '../home/ContentBanner'
import EpisodesList from '../content/EpisodesList'
import OptionsList from './OptionsList'
import api from '../../api'
import css from './Artist.module.less'


/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.artist
 */
const Artist = ({ profile, artist, ...rest }) => {
    const [backState, viewBackupRef] = useViewBackup('artist')
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {[{source: String, size: {width: Number, height: Number}}, Function]} */
    const [image, setImage] = useState(getImagePerResolution({}))
    /** @type {[Array<{icon: String, title: String, id: String}>, Function]} */
    const [options, setOptions] = useState(null)
    /** @type {[Number, Function]} */
    const [optionIndex, setOptionIndex] = useState(backState?.optionIndex)
    /** @type {[Array<Object>, Function]} */
    const [videos, setVideos] = useState(null)
    /** @type {[Number, Function]} */
    const [videoIndex, setVideoIndex] = useState(null)
    /** @type {{current: Number}} */
    const optionRef = useRef(null)
    const cacheKey = useMemo(() => (
        options && optionIndex != null ? `artist/${options[optionIndex].id}` : null
    ), [options, optionIndex])

    const setContentNavigate = useSetContentNavigate()

    /** @type {{video: Number, concert: Number}} */
    const optionIndexes = useMemo(() => {
        let out = {}, index = 0
        if (artist.videos && artist.videos.length > 0) {
            out.video = index
            index += 1
        }
        if (artist.concerts && artist.concerts.length > 0) {
            out.concert = index
        }
        return out
    }, [artist])

    /** @type {Function} */
    const setLocalContent = useCallback((ev) => {
        const target = ev.currentTarget || ev.target
        const index = parseInt(target.dataset.index)
        if (videos && videos.length) {
            /** backup all state to restore later */
            viewBackupRef.current = { optionIndex }
            setContentNavigate({ content: videos[index] })
        }
    }, [optionIndex, videos, setContentNavigate, viewBackupRef])

    /** @type {Function} */
    const calculateImage = useCallback((ref) => {
        if (ref) {
            const boundingRect = ref.getBoundingClientRect()
            setImage(getImagePerResolution({ width: boundingRect.width, content: artist }))
        }
    }, [artist, getImagePerResolution])

    /** @type {Function} */
    const processVideos = useProcessMusicVideos()

    useBackVideoIndex(videos, setVideoIndex)

    useEffect(() => {
        optionRef.current = optionIndex
        setVideos(null)  // for activate loading
        setVideoIndex(null)  // for activate loading
        if (optionIndex != null && options != null) {
            const loadVideos = async () => {
                const cacheVideos = await api.utils.getCustomCache(cacheKey)
                if (cacheVideos) {
                    setVideos(cacheVideos)
                } else {
                    const { data: videosData } = await (
                        optionIndex === optionIndexes.video
                            ? api.music.getVideos(profile, artist.videos)
                            : api.music.getConcerts(profile, artist.concerts)
                    )
                    if (videosData.length) {
                        processVideos(videosData)
                    }
                    await api.utils.saveCustomCache(cacheKey, videosData)
                    if (optionRef.current === optionIndex) {
                        setVideos(videosData)
                    }
                }
            }
            loadVideos()
        }
    }, [profile, artist, options, optionIndexes, optionIndex, processVideos, setVideos, cacheKey])

    useEffect(() => {
        const optionsTmp = []
        if (artist.videos && artist.videos.length > 0) {
            optionsTmp.push({ icon: '🎥', title: $L('Videos'), id: 'video' })
        }
        if (artist.concerts && artist.concerts.length > 0) {
            optionsTmp.push({ icon: '🎤', title: $L('Concerts'), id: 'concert' })
        }
        setOptions(optionsTmp)
        setOptionIndex(lastIndex => {
            if (lastIndex == null) {
                lastIndex = optionsTmp.length ? 0 : null
            } else {
                lastIndex = Math.min(lastIndex, optionsTmp.length)
            }
            return lastIndex
        })
    }, [profile, artist])

    return (
        <Row className={css.contentArtist} {...rest}>
            <Column className={css.col} ref={calculateImage}>
                {image.source &&
                    <Image className={css.poster} src={image.source} sizing='fill' />
                }
                <Cell className={css.modal}>
                    <Row align='start space-between'>
                        <Cell size="49%">
                            <ContentHeader content={artist} />
                            <div className={css.scrollerContainer}>
                                <Scroller direction='vertical'
                                    horizontalScrollbar='hidden'
                                    verticalScrollbar='auto'
                                    focusableScrollbar>
                                    <BodyText size='small'>
                                        {artist.description}
                                    </BodyText>
                                </Scroller>
                            </div>
                            <OptionsList
                                options={options}
                                optionIndex={optionIndex}
                                selectOption={setOptionIndex} />
                        </Cell>
                        <Cell size="49%">
                            <EpisodesList
                                key={`artist-${artist.id}-${optionIndex}`}
                                episodes={videos}
                                episodeIndex={videoIndex}
                                selectEpisode={setLocalContent} />
                        </Cell>
                    </Row>
                </Cell>
            </Column>
        </Row>
    )
}

Artist.propTypes = {
    profile: PropTypes.object.isRequired,
    artist: PropTypes.object.isRequired,
}

export default Artist
