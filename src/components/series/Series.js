
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'

import Image from '@enact/moonstone/Image'

import PropTypes from 'prop-types'
import SeriesOptions from './Options'
import Seasons from './Seasons'
import LangSelector from './LangSelector'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'

import { useSetRecoilState } from 'recoil'

import { pathState, playContentState } from '../../recoilConfig'
import api from '../../api'
import css from './Series.module.less'
import back from '../../back'


const ActivityViews = ({ index, children }) => children[index]

/**
 * @param {{
    profile: import('crunchyroll-js-api/src/types').Profile,
    series: Object,
    defaultEpisode: Object,
 }}
 */
const Series = ({ profile, series, defaultEpisode, ...rest }) => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Function} */
    const setPlayContent = useSetRecoilState(playContentState)
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {[{source: String, size: {width: Number, height: Number}}, Function]} */
    const [image, setImage] = useState(getImagePerResolution({}))
    /** @type {[Object, Function]} */
    const [episode, setEpisode] = useState(defaultEpisode)
    /** @type {[Number, Function]} */
    const [rating, setRating] = useState(0)
    /** @type {[Number, Function]} */
    const [currentIndex, setCurrentIndex] = useState(0)
    /** @type {Object} */
    const contentShort = useMemo(() => {
        return series ? { contentId: series.id, contentType: series.type } : {}
    }, [series])

    const selectEpisode = useCallback((episodeToPlay) => {
        back.pushHistory({ doBack: () => { setPath('/profiles/home/content') } })
        setPlayContent(episodeToPlay)
        setPath('/profiles/home/player')
    }, [setPath, setPlayContent])

    const calculateImage = useCallback((ref) => {
        if (ref) {
            const boundingRect = ref.getBoundingClientRect()
            setImage(getImagePerResolution({ width: boundingRect.width, content: series }))
        }
    }, [series, getImagePerResolution])

    const updateRating = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const star = parseInt(target.dataset.star) + 1
        api.review.updateRating(profile, { ...contentShort, rating: `${star}s` })
            .then(() => setRating(star))
    }, [profile, contentShort])

    useEffect(() => {
        if (series) {
            api.review.getRatings(profile, contentShort).then(({ rating: resRenting }) => {
                setRating(parseInt(resRenting.trimEnd('s')))
            })
            if (!defaultEpisode) {
                api.discover.getUpNext(profile, contentShort).then(nextEp => {
                    if (nextEp && nextEp.total > 0) {
                        setEpisode(nextEp.data[0])
                    } else {
                        /** @todo */
                    }
                })
            }
        }
    }, [series, profile, contentShort, defaultEpisode])
    /**
     * @todo  luego reproducir.
     */
    return (
        <Row className={css.contentSerie} {...rest}>
            <Column className={css.col} ref={calculateImage}>
                {image.source &&
                    <Image className={css.poster} src={image.source} sizing='fill' />
                }
                <Cell className={css.modal}>
                    <ActivityViews index={currentIndex}>
                        {episode ?
                            <SeriesOptions
                                series={series}
                                episode={episode}
                                rating={rating}
                                updateRating={updateRating}
                                setIndex={setCurrentIndex}
                                selectEpisode={selectEpisode} />
                            :
                            <div />
                        }
                        <Seasons profile={profile} series={series} selectEpisode={selectEpisode} />
                        <LangSelector profile={profile} series={series} />
                    </ActivityViews>
                </Cell>
            </Column>
        </Row>
    )
}

Series.propTypes = {
    profile: PropTypes.object.isRequired,
    series: PropTypes.object.isRequired,
    defaultEpisode: PropTypes.object,
}

export default Series
