
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import BodyText from '@enact/moonstone/BodyText'
import Image from '@enact/moonstone/Image'
import PropTypes from 'prop-types'

import { useRecoilValue } from 'recoil'

import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import { contentDetailBakState } from '../../recoilConfig'

import { $L } from '../../hooks/language'
import { useProcessMusicVideos } from '../../hooks/processMusicVideos'
import { useBackVideoIndex } from '../../hooks/backVideoIndex'
import Scroller from '../../patch/Scroller'
import { ContentHeader } from '../home/ContentBanner'
import EpisodesList from '../content/EpisodesList'
import Options from './Options'
import api from '../../api'
import { useSetPlayableContent } from '../../hooks/setContent'
import css from './Artist.module.less'


/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.artist
 */
const Artist = ({ profile, artist, ...rest }) => {
    /** @type {Object}  */
    const contentDetailBak = useRecoilValue(contentDetailBakState)
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {[{source: String, size: {width: Number, height: Number}}, Function]} */
    const [image, setImage] = useState(getImagePerResolution({}))
    /** @type {[Array<{icon: String, title: String, videos: Array}>, Function]} */
    const [options, setOptions] = useState(contentDetailBak.options
        ? JSON.parse(JSON.stringify(contentDetailBak.options))  // to avoid error setting videos, line 124
        : null
    )
    /** @type {[Number, Function]} */
    const [optionIndex, setOptionIndex] = useState(contentDetailBak.optionIndex)
    /** @type {[Array<Object>, Function]} */
    const [videos, setVideos] = useState(null)
    /** @type {[Number, Function]} */
    const [videoIndex, setVideoIndex] = useState(null)
    /** @type {{current: Number}} */
    const optionRef = useRef(null)
    /** @type {Function} */
    const setPlayableContent = useSetPlayableContent()

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
    const setContentToPlay = useCallback((ev) => {
        const target = ev.currentTarget || ev.target
        const index = parseInt(target.dataset.index)
        if (videos && videos.length) {
            options.forEach(e => { e.videos = [] })  // force reload
            const contentBak = { options, optionIndex }
            setPlayableContent({ contentToPlay: videos[index], contentBak })
        }
    }, [videos, optionIndex, setPlayableContent, options])

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
        if (contentDetailBak.options == null) {
            const out = []
            if (artist.videos && artist.videos.length > 0) {
                out.push({ icon: '🎥', title: $L('Videos'), videos: [] })
            }
            if (artist.concerts && artist.concerts.length > 0) {
                out.push({ icon: '🎤', title: $L('Concerts'), videos: [] })
            }
            setOptions(out)
            if (out.length) {
                setOptionIndex(0)
            }
        }
    }, [profile, artist, contentDetailBak.options])

    useEffect(() => {
        optionRef.current = optionIndex
        setVideos(null)
        setVideoIndex(null)
        if (optionIndex != null && options != null) {
            /** @type {Promise} */
            let prom = null
            if (options[optionIndex].videos.length) {
                prom = Promise.resolve().then(() => options[optionIndex].videos)
            } else {
                if (optionIndex === optionIndexes.video) {
                    prom = api.music.getVideos(profile, artist.videos).then(processVideos)
                } else {
                    prom = api.music.getConcerts(profile, artist.concerts).then(processVideos)
                }
            }
            prom.then(data => {
                if (optionRef.current === optionIndex) {
                    options[optionIndex].videos = data
                    setVideos(data)
                }
            })
        }
    }, [profile, artist, options, optionIndexes, optionIndex, processVideos, setVideos])

    return (
        <Row className={css.contentArtist} {...rest}>
            <Column className={css.col} ref={calculateImage}>
                {image.source &&
                    <Image className={css.poster} src={image.source} sizing='fill' />
                }
                <Cell className={css.modal}>
                    <Row align='start space-between'>
                        <Cell size="49%" style={{ height: '100%', width: '49%' }}>
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
                            <Options
                                options={options}
                                selectOption={setOptionIndex}
                                optionIndex={optionIndex} />
                        </Cell>
                        <Cell size="49%" style={{ height: '100%', width: '49%' }}>
                            <EpisodesList
                                seasonIndex={optionIndex}
                                episodes={videos}
                                selectEpisode={setContentToPlay}
                                episodeIndex={videoIndex} />
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
