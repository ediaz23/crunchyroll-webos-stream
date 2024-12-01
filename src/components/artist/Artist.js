
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import BodyText from '@enact/moonstone/BodyText'
import Image from '@enact/moonstone/Image'
import PropTypes from 'prop-types'

import { useSetRecoilState, useRecoilValue, useRecoilState } from 'recoil'

import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import {
    pathState, playContentState, isPremiumState,
    contentDetailBakState
} from '../../recoilConfig'

import { $L } from '../../hooks/language'
import Scroller from '../../patch/Scroller'
import { ContentHeader } from '../home/ContentBanner'
import EpisodesList from '../content/EpisodesList'
import Options from './Options'
import back from '../../back'
import api from '../../api'
import css from './Artist.module.less'
import { getIsPremium } from '../../utils'


/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.artist
 */
const Artist = ({ profile, artist, ...rest }) => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {[Object, Function]} */
    const [playContent, setPlayContent] = useRecoilState(playContentState)
    /** @type {Boolean} */
    const isPremium = useRecoilValue(isPremiumState)
    /** @type {[Object, Function]}  */
    const [contentDetailBak, setContentDetailBak] = useRecoilState(contentDetailBakState)
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {[{source: String, size: {width: Number, height: Number}}, Function]} */
    const [image, setImage] = useState(getImagePerResolution({}))
    /** @type {[Array<{icon: String, title: String, videos: Array}>, Function]} */
    const [options, setOptions] = useState(JSON.parse(JSON.stringify(contentDetailBak.options || [])))
    /** @type {[Number, Function]} */
    const [optionIndex, setOptionIndex] = useState(contentDetailBak.optionIndex)
    /** @type {[Array<Object>, Function]} */
    const [videos, setVideos] = useState(null)
    /** @type {[Number, Function]} */
    const [videoIndex, setVideoIndex] = useState(null)
    /** @type {{current: Number}} */
    const optionRef = useRef(null)
    /** @type {{current: Object}} */
    const playContentRef = useRef(playContent)

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
            setContentDetailBak({ options, optionIndex })
            back.pushHistory({ doBack: () => { setPath('/profiles/home/content') } })
            setPlayContent(videos[index])
            setPath('/profiles/home/player')
        }
    }, [videos, setPath, setPlayContent, optionIndex, setContentDetailBak, options])

    /** @type {Function} */
    const calculateImage = useCallback((ref) => {
        if (ref) {
            const boundingRect = ref.getBoundingClientRect()
            setImage(getImagePerResolution({ width: boundingRect.width, content: artist }))
        }
    }, [artist, getImagePerResolution])

    /** @type {Function} */
    const preProcessVideos = useCallback(({ data }) => {
        data.forEach(ep => {
            ep.playhead = { progress: 0 }
            ep.showPremium = !isPremium && getIsPremium(ep)
            let chunks = []
            if (ep.originalRelease) {
                chunks.push((new Date(ep.originalRelease)).getFullYear())
            }
            if (ep.genres && ep.genres.length) {
                chunks.push(ep.genres.map(e => e.displayValue).join(', '))
            }
            if (chunks.length && !ep.description) {
                ep.description = chunks.join('\n')
            }
        })
        data.sort((a, b) => {
            const dateA = a.originalRelease ? new Date(a.originalRelease) : new Date();
            const dateB = b.originalRelease ? new Date(b.originalRelease) : new Date();
            return dateB - dateA;
        })
        return data
    }, [isPremium])

    useEffect(() => {
        if (videos != null && videos.length) {
            if (playContentRef.current != null) {
                const index = videos.findIndex(v => v.id === playContentRef.current.id)
                setVideoIndex(Math.max(0, index))
                playContentRef.current = null
            } else {
                setVideoIndex(0)
            }
        }
    }, [videos])

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
        if (optionIndex != null && options.length) {
            /** @type {Promise} */
            let prom = null
            if (options[optionIndex].videos.length) {
                prom = Promise.resolve().then(() => options[optionIndex].videos)
            } else {
                if (optionIndex === optionIndexes.video) {
                    prom = api.music.getVideos(profile, artist.videos).then(preProcessVideos)
                } else {
                    prom = api.music.getConcerts(profile, artist.concerts).then(preProcessVideos)
                }
            }
            prom.then(data => {
                if (optionRef.current === optionIndex) {
                    options[optionIndex].videos = data
                    setVideos(data)
                }
            })
        }
    }, [profile, artist, options, optionIndexes, optionIndex, preProcessVideos, setVideos])

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
                            <Options
                                options={options}
                                selectOption={setOptionIndex}
                                optionIndex={optionIndex} />
                        </Cell>
                        <Cell size="49%">
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
