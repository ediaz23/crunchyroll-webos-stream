
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import BodyText from '@enact/moonstone/BodyText'
import Image from '@enact/moonstone/Image'
import Spinner from '@enact/moonstone/Spinner'
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
    const [videos, setVideos] = useState(contentDetailBak.videos || [])
    /** @type {[Number, Function]} */
    const [selectIndex, setSelectIndex] = useState(contentDetailBak.selectIndex || 0)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)
    /** @type {Array<{icon: String, title: String}>} */
    const optionList = useMemo(() => {
        let out = []
        if (artist.videos && artist.videos.length > 0) {
            out.push({ icon: '🎥', title: $L('Videos') })
        }
        if (artist.concerts && artist.concerts.length > 0) {
            out.push({ icon: '🎤', title: $L('Concerts') })
        }
        return out
    }, [artist])

    /** @type {{video: Number, concert: Number}} */
    const optionIndex = useMemo(() => {
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
        const videIndex = parseInt(target.dataset.index)
        setContentDetailBak({ videos, videIndex, selectIndex })
        back.pushHistory({ doBack: () => { setPath('/profiles/home/content') } })
        setPlayContent(videos[videIndex])
        setPath('/profiles/home/player')
    }, [videos, setPath, setPlayContent, selectIndex, setContentDetailBak])

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
        setVideos(data)
        setLoading(false)
    }, [setVideos, isPremium])

    /** @type {Function} */
    const onSetSelectContent = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        setSelectIndex(parseInt(target.dataset.index))
    }, [setSelectIndex])

    useEffect(() => {
        if (contentDetailBak.selectIndex != null &&
            contentDetailBak.selectIndex !== selectIndex) {
            setContentDetailBak({
                videos: undefined,
                videIndex: undefined,
            })
        }
    }, [selectIndex, setContentDetailBak, contentDetailBak.selectIndex])

    useEffect(() => {
        if (contentDetailBak.videIndex == null) {
            setLoading(true)
            if (selectIndex === optionIndex.video) {
                api.music.getVideos(profile, artist.videos).then(preProcessVideos)
            } else if (selectIndex === optionIndex.concert) {
                api.music.getConcerts(profile, artist.concerts).then(preProcessVideos)
            }
        } else {
            setLoading(false)
        }
    }, [profile, artist, optionIndex, selectIndex, preProcessVideos, contentDetailBak.videIndex])

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
                                    verticalScrollbar='auto'>
                                    <BodyText size='small'>
                                        {artist.description}
                                    </BodyText>
                                </Scroller>
                            </div>
                            <Options
                                optionList={optionList}
                                selectContent={onSetSelectContent}
                                selectIndex={selectIndex} />
                        </Cell>
                        <Cell size="49%" style={{ height: '100%', width: '49%' }}>
                            {loading ?
                                <Column align='center center'>
                                    <Spinner />
                                </Column>
                                :
                                <EpisodesList
                                    episodes={videos}
                                    selectEpisode={setContentToPlay}
                                    episodeIndex={contentDetailBak.videIndex} />
                            }
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
