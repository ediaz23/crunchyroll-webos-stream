
import { useRef, useEffect, useState, useMemo } from 'react'
import { Row, Cell } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import BodyText from '@enact/moonstone/BodyText'
import Image from '@enact/moonstone/Image'
import LabeledIcon from '@enact/moonstone/LabeledIcon'
import PropTypes from 'prop-types'
import { useRecoilValue } from 'recoil'

import { $L } from '../../hooks/language'
import { currentProfileState } from '../../recoilConfig'
import api from '../../api'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import css from './ContentBanner.module.less'
import withNavigable from '../../hooks/navigable'


/**
 * @param {Object} metadata
 * @param {Array} tags
 */
const setTags = (metadata, tags) => {
    if (metadata.is_subbed) {
        tags.push($L('Sub'))
    }
    if (metadata.is_dubbed) {
        tags.push($L('Dub'))
    }
    if (metadata.is_simulcast) {
        tags.push($L('Simulcast'))
    }
    if (metadata.is_premium_only) {
        tags.push($L('Premium'))
    }
    if (metadata.is_clip) {
        tags.push($L('Short'))
    }
    if (metadata.is_mature) {
        tags.push($L('Adults'))
    }
}

/**
 * @param {Object} metadata
 * @param {Array} meta
 */
const setEpisodeMetadata = (metadata, meta) => {
    if (metadata.season_number !== null) {
        meta.push(`${$L('Season')} ${metadata.season_number}`)
    }
    if (metadata.episode) {
        meta.push(`${$L('Ep')} ${metadata.episode}`)
    }
    if (metadata.episode_air_date) {
        meta.push(metadata.episode_air_date.split('-')[0])
    }
}

/**
 * @param {Object} metadata
 * @param {Array} meta
 */
const setSerieMetadata = (metadata, meta) => {
    if (metadata.season_count !== null) {
        meta.push(`${$L('Seasons')} ${metadata.season_count}`)
    }
    if (metadata.episode_count !== null) {
        meta.push(`${$L('Episodes')} ${metadata.episode_count}`)
    }
    if (metadata.series_launch_year !== null) {
        meta.push(`${metadata.series_launch_year}`)
    }
}

/**
 * @param {Object} metadata
 * @param {Array} meta
 */
const setMovieMetadata = (metadata, meta) => {
    if (metadata.movie_release_year !== null) {
        meta.push(`${metadata.movie_release_year}`)
    }
}

/**
 * Show metadata for a content
 */
export const ContentMetadata = ({ content }) => {
    const tags = [], meta = []
    let rating = null

    if (content.episode_metadata) {
        setTags(content.episode_metadata, tags)
        setEpisodeMetadata(content.episode_metadata, meta)
    } else if (content.series_metadata) {
        setTags(content.series_metadata, tags)
        setSerieMetadata(content.series_metadata, meta)
    } else if (content.movie_listing_metadata) {
        setTags(content.movie_listing_metadata, tags)
        setMovieMetadata(content.movie_listing_metadata, meta)
    } else if (content.genres) {
        content.genres.forEach(val => tags.push(val.displayValue))
        if (content.publishDate) {
            meta.push(content.publishDate.split('-')[0])
        }
    }
    if (content.rating) {
        rating = content.rating.average
    }

    return (
        <Row align='baseline space-between'>
            <Heading size='small' spacing="small">
                {tags.join(' ')}
            </Heading>
            {!!rating &&
                <LabeledIcon icon="star" labelPosition="before">
                    {rating}
                </LabeledIcon>
            }
            {!!(meta.length) && (
                <Heading size='small' spacing="small">
                    {meta.join(' ')}
                </Heading>
            )}
        </Row>
    )
}
ContentMetadata.propTypes = {
    content: PropTypes.object.isRequired,
}


/**
 * Show header for content, with title
 * @param {{content: Object, noCategory: Boolean}}
 */
export const ContentHeader = ({ content, noCategory }) => {
    /** @type {import('crunchyroll-js-api').Types.Profile}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {[Array<String>, Function]} */
    const [categories, setCategories] = useState([])
    const allowedTypes = useMemo(() => ['series', 'episode', 'movie', 'movie_listing'], [])

    useEffect(() => {
        if (content && !noCategory && allowedTypes.includes(content.type)) {
            api.discover.getCategories(profile, { contentId: content.id }).then(({ data }) => {
                setCategories(data.map(val2 => val2.localization.title))
            })
        } else {
            setCategories([])
        }
    }, [content, noCategory, setCategories, profile, allowedTypes])

    return (
        <>
            <Heading size="large">
                {content.title}
            </Heading>
            {content.subTitle && (
                <Heading size="small">
                    {content.subTitle}
                </Heading>
            )}
            <ContentMetadata content={content} />
            {categories && categories.length > 0 && (
                <Heading size='small' spacing="small">
                    {categories.join(' - ')}
                </Heading>
            )}
        </>
    )
}
ContentHeader.propTypes = {
    content: PropTypes.object.isRequired,
    noCategory: PropTypes.bool,
}

const RowNavigable = withNavigable(Row, css.active)


const HomeContentBanner = ({ content, noCategory, ...rest }) => {
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {[{source: String, size: {width: Number, height: Number}}, Function]} */
    const [image, setImage] = useState(getImagePerResolution({}))
    /** @type {{current: HTMLElement}} */
    const compRef = useRef(null)

    useEffect(() => {
        if (compRef && compRef.current) {
            const boundingRect = compRef.current.getBoundingClientRect()
            setImage(getImagePerResolution({ height: boundingRect.height, width: boundingRect.width, content }))
        }
    }, [compRef, content, getImagePerResolution])

    return (
        <RowNavigable id='content-banner' className={css.homeContentBanner} {...rest}>
            <Cell size="50%">
                <ContentHeader content={content} noCategory={noCategory} />
                <BodyText size='small'>
                    {content.description}
                </BodyText>
            </Cell>
            <Cell ref={compRef}>
                {image.source &&
                    <Image className={css.poster} src={image.source} sizing='fill' />
                }
            </Cell>
        </RowNavigable>
    )
}

HomeContentBanner.propTypes = {
    content: PropTypes.object.isRequired,
    noCategory: PropTypes.bool
}

HomeContentBanner.defaultProps = {
    noCategory: false
}

export default HomeContentBanner
