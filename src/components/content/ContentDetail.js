
import { useEffect, useState, useCallback, useRef } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
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
    const [currentIndex, setCurrentIndex] = useState(contentDetailBak.currentIndex || 0)
    /** @type {{current: Number}} */
    const ratingRef = useRef(0)

    /** @type {Function} */
    const setContentToPlay = useCallback((contentToPlay, backState) => {
        if (currentIndex !== 0) {
            back.popHistory()
        }
        setContentDetailBak({ currentIndex, rating: ratingRef.current, ...(backState || {}) })
        back.pushHistory({ doBack: () => { setPath('/profiles/home/content') } })
        setPlayContent(contentToPlay)
        setPath('/profiles/home/player')
    }, [setPath, setPlayContent, currentIndex, setContentDetailBak])

    /** @type {Function} */
    const calculateImage = useCallback((ref) => {
        if (ref) {
            const boundingRect = ref.getBoundingClientRect()
            setImage(getImagePerResolution({ width: boundingRect.width, content }))
        }
    }, [content, getImagePerResolution])

    /** @type {Function} */
    const onSetCurrentIndex = useCallback(tmpIndex => {
        setContentDetailBak({})
        setCurrentIndex(tmpIndex)
    }, [setContentDetailBak, setCurrentIndex])

    /** @type {Function} */
    const saveRating = useCallback(rating => { ratingRef.current = rating }, [])

    useEffect(() => { // to back state after back from playing
        if (contentDetailBak.currentIndex != null && contentDetailBak.currentIndex !== 0) {
            back.pushHistory({ doBack: () => { setCurrentIndex(0) } })
        }
    }, [contentDetailBak.currentIndex])

    return (
        <Row className={css.ContentDetail} {...rest}>
            <Column className={css.col} ref={calculateImage}>
                {image.source &&
                    <Image className={css.poster} src={image.source} sizing='fill' />
                }
                <Cell className={css.modal}>
                    <ActivityViews index={currentIndex}>
                        <Options
                            profile={profile}
                            content={content}
                            saveRating={saveRating}
                            setIndex={onSetCurrentIndex}
                            setContentToPlay={setContentToPlay} />
                        {content.type === 'series' ?
                            <Seasons
                                profile={profile}
                                series={content}
                                setContentToPlay={setContentToPlay}
                                isPremium={isPremium}
                                contentDetailBak={contentDetailBak} />
                            :
                            <Movies
                                profile={profile}
                                movieListing={content}
                                setContentToPlay={setContentToPlay}
                                isPremium={isPremium}
                                contentDetailBak={contentDetailBak} />
                        }
                        <LangSelector
                            profile={profile}
                            content={content} />
                    </ActivityViews>
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
