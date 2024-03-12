
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import Spinner from '@enact/moonstone/Spinner'

import Image from '@enact/moonstone/Image'

import PropTypes from 'prop-types'
import Options from './Options'
import Seasons from './Seasons'
import Movies from './Movies'
import LangSelector from './LangSelector'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'

import { useSetRecoilState } from 'recoil'

import { pathState, playContentState } from '../../recoilConfig'
import api from '../../api'
import css from './ContentDetail.module.less'
import back from '../../back'


const ActivityViews = ({ index, children }) => children[index]

/**
 * @param {{
    profile: import('crunchyroll-js-api/src/types').Profile,
    content: Object,
 }}
 */
const ContentDetail = ({ profile, content, ...rest }) => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Function} */
    const setPlayContent = useSetRecoilState(playContentState)
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {[{source: String, size: {width: Number, height: Number}}, Function]} */
    const [image, setImage] = useState(getImagePerResolution({}))
    /** @type {[Number, Function]} */
    const [rating, setRating] = useState(0)
    /** @type {[Number, Function]} */
    const [currentIndex, setCurrentIndex] = useState(0)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)
    /** @type {{contentId: String, contentType: String}} */
    const contentShort = useMemo(() => {
        return content ? { contentId: content.id, contentType: content.type } : {}
    }, [content])

    const setContentToPlay = useCallback(contentToPlay => {
        if (currentIndex !== 0) {
            back.popHistory()
        }
        back.pushHistory({ doBack: () => { setPath('/profiles/home/content') } })
        setPlayContent(contentToPlay)
        setPath('/profiles/home/player')
    }, [setPath, setPlayContent, currentIndex])

    const calculateImage = useCallback((ref) => {
        if (ref) {
            const boundingRect = ref.getBoundingClientRect()
            setImage(getImagePerResolution({ width: boundingRect.width, content }))
        }
    }, [content, getImagePerResolution])

    const updateRating = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const star = parseInt(target.dataset.star) + 1
        api.review.updateRating(profile, { ...contentShort, rating: `${star}s` })
            .then(() => setRating(star))
    }, [profile, contentShort])

    useEffect(() => {
        const load = async () => {
            if (content) {
                const { rating: resRenting } = await api.review.getRatings(profile, contentShort)
                setRating(parseInt(resRenting.trimEnd('s')))
            }
        }
        setLoading(true)
        load().then(() => setLoading(false))
    }, [content, profile, contentShort])

    return (
        <Row className={css.ContentDetail} {...rest}>
            <Column className={css.col} ref={calculateImage}>
                {image.source &&
                    <Image className={css.poster} src={image.source} sizing='fill' />
                }
                <Cell className={css.modal}>
                    {loading ?
                        <Column align='center center'>
                            <Spinner style={{ height: 'auto' }} />
                        </Column>
                        :
                        <ActivityViews index={currentIndex}>
                            <Options
                                profile={profile}
                                content={content}
                                rating={rating}
                                updateRating={updateRating}
                                setIndex={setCurrentIndex}
                                setContentToPlay={setContentToPlay} />
                            {content.type === 'series' ?
                                <Seasons
                                    profile={profile}
                                    series={content}
                                    setContentToPlay={setContentToPlay} />
                                :
                                <Movies
                                    profile={profile}
                                    movieListing={content}
                                    setContentToPlay={setContentToPlay} />
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
