
import { useEffect, useState, useCallback } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import BodyText from '@enact/moonstone/BodyText'
import Image from '@enact/moonstone/Image'
import Spinner from '@enact/moonstone/Spinner'
import PropTypes from 'prop-types'

import { useSetRecoilState } from 'recoil'

import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import { pathState, playContentState } from '../../recoilConfig'

import Scroller from '../../patch/Scroller'
import { ContentHeader } from '../home/ContentBanner'
import EpisodesList from '../content/EpisodesList'
import Options from './Options'
import back from '../../back'
import api from '../../api'
import css from './Artist.module.less'


/**
 * @param {{
    profile: import('crunchyroll-js-api').Types.Profile,
    artist: Object,
 }}
 */
const Artist = ({ profile, artist, ...rest }) => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Function} */
    const setPlayContent = useSetRecoilState(playContentState)
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {[{source: String, size: {width: Number, height: Number}}, Function]} */
    const [image, setImage] = useState(getImagePerResolution({}))
    /** @type {[Object, Function]} */
    const [videos, setVideos] = useState([])
    /** @type {[String, Function]} */
    const [selectContent, setSelectContent] = useState('')
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)

    const selectVideo = useCallback((ev) => {
        const target = ev.currentTarget || ev.target
        back.pushHistory({ doBack: () => { setPath('/profiles/home/content') } })
        setPlayContent(videos[parseInt(target.dataset.index)])
        setPath('/profiles/home/player')
    }, [videos, setPath, setPlayContent])

    const calculateImage = useCallback((ref) => {
        if (ref) {
            const boundingRect = ref.getBoundingClientRect()
            setImage(getImagePerResolution({ width: boundingRect.width, content: artist }))
        }
    }, [artist, getImagePerResolution])

    const preProcessVideos = useCallback(({ data }) => {
        for (let item of data) {
            item.playhead = { progress: 0 }
        }
        setVideos(data)
        setLoading(false)
    }, [setVideos])

    useEffect(() => {
        if (artist.concerts && artist.concerts.length > 0) {
            setSelectContent('concerts')
        } else if (artist.videos && artist.videos.length > 0) {
            setSelectContent('videos')
        }
    }, [artist])

    useEffect(() => {
        setLoading(true)
        if (selectContent === 'videos') {
            api.music.getVideos(profile, artist.videos).then(preProcessVideos)
        } else if (selectContent === 'concerts') {
            api.music.getConcerts(profile, artist.concerts).then(preProcessVideos)
        }
    }, [profile, artist, selectContent, preProcessVideos])

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
                                    verticalScrollbar='auto'>
                                    <BodyText size='small'>
                                        {artist.description}
                                    </BodyText>
                                </Scroller>
                            </div>
                            <Options artist={artist} selectContent={setSelectContent} />
                        </Cell>
                        <Cell size="49%">
                            {loading ?
                                <Column align='center center'>
                                    <Spinner />
                                </Column>
                                :
                                <EpisodesList episodes={videos} selectEpisode={selectVideo} />
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
