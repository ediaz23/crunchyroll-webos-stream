
import { useEffect, useState, useCallback } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import FloatingLayer from '@enact/ui/FloatingLayer'

import Image from '@enact/moonstone/Image'
import Heading from '@enact/moonstone/Heading'

import { ContentMetadata } from './HomeContentBanner'
import useGetImagePerResolution from '../hooks/getImagePerResolution'
import api from '../api'
import css from './ContentSerie.module.less'


/**
 * @param obj
 * @param {import('crunchyroll-js-api/src/types').Profile} obj.profile
 * @param {Object} content
 */
const ContentSerie = ({ profile, content, rest }) => {
    /** @type {[Array<Object>, Function]} */
    const [seasons, setSeasons] = useState([])
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {[{source: String, size: {width: Number, height: Number}}, Function]} */
    const [image, setImage] = useState(getImagePerResolution({}))

    const calculateImage = useCallback((ref) => {
        const boundingRect = ref.getBoundingClientRect()
        setImage(getImagePerResolution({ width: boundingRect.width, content }))
    }, [content, getImagePerResolution])

    useEffect(() => {
        const loadData = async () => {
            //            console.log(await api.cms.getSeasons(profile, { serieId: content.id }))
//                        console.log(await api.cms.getSerie(profile, { serieId: content.id }))
            //            console.log(utils.stringifySorted((await api.cms.getSerie(profile, { serieId: content.id })).data[0]))
            //            api.review.getRatings(profile, { contentId: content.id, contentType: content.type })
            //            api.discover.getUpNext(profile, { contentId: content.id })
            //            api.discover.getCategories(profile, { contentId: content.id })
        }
        if (content) {
            console.log(content)
            loadData()
        }
    }, [content, profile])

    return (
        <Row className={css.contentSerie}>
            <Column className={css.col} ref={calculateImage}>
                {image.source &&
                    <Image className={css.poster} src={image.source} sizing='fill' />
                }
                <Cell className={css.modal}>
                    <div className={css.metadata}>
                        <Heading size="title" spacing="small">
                            {content.title}
                        </Heading>
                        <ContentMetadata content={content} />
                    </div>
                </Cell>
            </Column>
        </Row>
    )
}

export default ContentSerie
