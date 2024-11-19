
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
    /** @type {Function} */
    const setPlayContent = useSetRecoilState(playContentState)
    /** @type {Boolean} */
    const isPremium = useRecoilValue(isPremiumState)
    /** @type {[Object, Function]}  */
    const [contentDetailBak, setContentDetailBak] = useRecoilState(contentDetailBakState)
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {[{source: String, size: {width: Number, height: Number}}, Function]} */
    const [image, setImage] = useState(getImagePerResolution({}))
    /** @type {[Object, Function]} */
    const [videos, setVideos] = useState(null)
    /** @type {[Number, Function]} */
    const [optionIndex, setOptionIndex] = useState(contentDetailBak.optionIndex)
    /** @type {{current: Number}} */
    const optionRef = useRef(null)
    /** @type {Array<{icon: String, title: String, videos: Array}>} */
    const [options, setOptions] = useState(contentDetailBak.options)

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
        const videoIndex = parseInt(target.dataset.index)
        setContentDetailBak({
            options,
            optionIndex,
            videoIndex,
        })
        back.pushHistory({ doBack: () => { setPath('/profiles/home/content') } })
        setPlayContent(videos[videoIndex])
        setPath('/profiles/home/player')
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
        })
        return data
    }, [isPremium])

    useEffect(() => {
        if (contentDetailBak.selectIndex != null &&
            contentDetailBak.selectIndex !== optionIndex) {
            // reset bak values
            setContentDetailBak({ videoIndex: undefined })
        }
    }, [optionIndex, setContentDetailBak, contentDetailBak.selectIndex])

    useEffect(() => {
        optionRef.current = optionIndex
        setVideos(null)
        if (optionIndex != null) {
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
                    setVideos(data)
                }
            })
        }
    }, [profile, artist, options, optionIndexes, optionIndex, preProcessVideos, setVideos])

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
        }
    }, [profile, artist, contentDetailBak.options])

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
                                episodeIndex={contentDetailBak.videoIndex} />
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
