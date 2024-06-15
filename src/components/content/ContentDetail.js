
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import Spinner from '@enact/moonstone/Spinner'
import Image from '@enact/moonstone/Image'

import PropTypes from 'prop-types'
import { useSetRecoilState, useRecoilValue, useRecoilState } from 'recoil'

import Options from './Options'
import Seasons from './Seasons'
import Movies from './Movies'
import LangSelector from './LangSelector'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'

import {
    pathState, playContentState, isPremiumState,
    contentDetailBakState
} from '../../recoilConfig'
import api from '../../api'
import css from './ContentDetail.module.less'
import back from '../../back'


const ActivityViews = ({ index, children }) => children[index]

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.content
 */
const ContentDetail = ({ profile, content, ...rest }) => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Function} */
    const setPlayContent = useSetRecoilState(playContentState)
    /** @type {Boolean} */
    const isPremium = useRecoilValue(isPremiumState)
    /** @type {[{currentIndex: Number}, Function]}  */
    const [contentDetailBak, setContentDetailBak] = useRecoilState(contentDetailBakState)
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {[{source: String, size: {width: Number, height: Number}}, Function]} */
    const [image, setImage] = useState(getImagePerResolution({}))
    /** @type {[Number, Function]} */
    const [rating, setRating] = useState(contentDetailBak.rating || 0)
    /** @type {[Number, Function]} */
    const [currentIndex, setCurrentIndex] = useState(contentDetailBak.currentIndex || 0)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)
    /** @type {{contentId: String, contentType: String}} */
    const contentShort = useMemo(() => {
        return content ? { contentId: content.id, contentType: content.type } : {}
    }, [content])

    /** @type {Function} */
    const setContentToPlay = useCallback((contentToPlay, bakState) => {
        if (currentIndex !== 0) {
            back.popHistory()
            setContentDetailBak({ currentIndex, rating, ...(bakState || {}) })
        }
        back.pushHistory({ doBack: () => { setPath('/profiles/home/content') } })
        setPlayContent(contentToPlay)
        setPath('/profiles/home/player')
    }, [setPath, setPlayContent, currentIndex, rating, setContentDetailBak])

    /** @type {Function} */
    const calculateImage = useCallback((ref) => {
        if (ref) {
            const boundingRect = ref.getBoundingClientRect()
            setImage(getImagePerResolution({ width: boundingRect.width, content }))
        }
    }, [content, getImagePerResolution])

    /** @type {Function} */
    const updateRating = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const star = parseInt(target.dataset.star) + 1
        api.review.updateRating(profile, { ...contentShort, rating: `${star}s` })
            .then(() => setRating(star))
    }, [profile, contentShort])

    /** @type {Function} */
    const onSetCurrentIndex = useCallback(tmpIndex => {
        setContentDetailBak({})
        setCurrentIndex(tmpIndex)
    }, [setContentDetailBak, setCurrentIndex])

    /** @type {Function} */
    const onSelectSeason = useCallback(newVal => setContentDetailBak(oldVal => {
        return { ...oldVal, ...newVal }
    }), [setContentDetailBak])

    useEffect(() => { // to back state after back from playing
        if (contentDetailBak.currentIndex != null) {
            back.pushHistory({ doBack: () => { setCurrentIndex(0) } })
        }
    }, [contentDetailBak.currentIndex])

    useEffect(() => {
        const load = async () => {
            if (contentShort) {
                const { rating: resRenting } = await api.review.getRatings(profile, contentShort)
                setRating(parseInt(resRenting.trimEnd('s')))
            }
        }
        if (contentDetailBak.rating == null) {
            setLoading(true)
            load().then(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [content, profile, contentShort, contentDetailBak.rating])

    return (
        <Row className={css.ContentDetail} {...rest}>
            <Column className={css.col} ref={calculateImage}>
                {image.source &&
                    <Image className={css.poster} src={image.source} sizing='fill' />
                }
                <Cell className={css.modal}>
                    {loading &&
                        <Column align='center center'>
                            <Spinner style={{ height: 'auto' }} />
                        </Column>
                    }
                    {!loading &&
                        <ActivityViews index={currentIndex}>
                            <Options
                                profile={profile}
                                content={content}
                                rating={rating}
                                updateRating={updateRating}
                                setIndex={onSetCurrentIndex}
                                setContentToPlay={setContentToPlay} />
                            {content.type === 'series' ?
                                <Seasons
                                    profile={profile}
                                    series={content}
                                    setContentToPlay={setContentToPlay}
                                    isPremium={isPremium}
                                    contentDetailBak={contentDetailBak}
                                    onSelectSeason={onSelectSeason} />
                                :
                                <Movies
                                    profile={profile}
                                    movieListing={content}
                                    setContentToPlay={setContentToPlay}
                                    isPremium={isPremium}
                                    contentDetailBak={contentDetailBak}
                                    onSelectSeason={onSelectSeason} />
                            }
                            <LangSelector
                                profile={profile}
                                content={content} />
                        </ActivityViews>
                    }
                </Cell>
            </Column>
        </Row>
    )
}

ContentDetail.propTypes = {
    profile: PropTypes.object.isRequired,
    content: PropTypes.object.isRequired,
}

export default ContentDetail
