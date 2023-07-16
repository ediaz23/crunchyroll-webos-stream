
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'

import Image from '@enact/moonstone/Image'

import { ContentHeader } from './HomeContentBanner'
import ContentSerieOptions from './ContentSerieOptions'
import ContentSerieLangSelector from './ContentSerieLangSelector'
import useGetImagePerResolution from '../hooks/getImagePerResolution'
import api from '../api'
import css from './ContentSerie.module.less'


const ActivityViews = ({ index, children }) => children[index]

/**
 * @param obj
 * @param {import('crunchyroll-js-api/src/types').Profile} obj.profile
 * @param {Object} content
 */
const ContentSerie = ({ profile, content: serie, defaultEpisode, ...rest }) => {
    /** @type {[Array<Object>, Function]} */
    //    const [seasons, setSeasons] = useState([])
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
        return serie ? { contentId: serie.id, contentType: serie.type } : {}
    }, [serie])

    const calculateImage = useCallback((ref) => {
        if (ref) {
            const boundingRect = ref.getBoundingClientRect()
            setImage(getImagePerResolution({ width: boundingRect.width, content: serie }))
        }
    }, [serie, getImagePerResolution])

    const updateRating = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const star = parseInt(target.dataset.star) + 1
        api.review.updateRating(profile, { ...contentShort, rating: `${star}s` })
            .then(() => setRating(star))
    }, [profile, contentShort])

    useEffect(() => {
        //        api.cms.getSeasons(profile, { serieId: content.id }).then(console.log)
        //        api.cms.getSerie(profile, { serieId: content.id }).then(console.log)
        //            console.log(utils.stringifySorted((await api.cms.getSerie(profile, { serieId: content.id })).data[0]))
        if (serie) {
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
    }, [serie, profile, contentShort, defaultEpisode])
    /**
     * @todo hacer los subtitulos y luego cambiar temporadas y episodios
     *       y luego reproducir.
     */
    return (
        <Row className={css.contentSerie} {...rest}>
            <Column className={css.col} ref={calculateImage}>
                {image.source &&
                    <Image className={css.poster} src={image.source} sizing='fill' />
                }
                <Cell className={css.modal}>
                    <div className={css.metadata}>
                        <ContentHeader content={serie} />
                        <ActivityViews index={currentIndex}>
                            <ContentSerieOptions
                                episode={episode}
                                rating={rating}
                                updateRating={updateRating}
                                setIndex={setCurrentIndex} />
                            <div>prueba</div>
                            <ContentSerieLangSelector profile={profile} serie={serie} />
                        </ActivityViews>
                    </div>
                </Cell>
            </Column>
        </Row>
    )
}

export default ContentSerie
