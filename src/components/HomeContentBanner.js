
import { useRef, useEffect, useState } from 'react'
import { Row, Cell } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import BodyText from '@enact/moonstone/BodyText'
import Image from '@enact/moonstone/Image'

import PropTypes from 'prop-types'
import $L from '@enact/i18n/$L'

import useGetImagePerResolution from '../hooks/getImagePerResolution'
import css from './HomeContentBanner.module.less'
import { formatDurationMs } from '../utils'

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
    if (metadata.duration_ms !== null) {
        meta.push(`${$L('Duration')} ${formatDurationMs(metadata.duration_ms)}`)
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
        meta.push(`${$L('Year')} ${metadata.series_launch_year}`)
    }
}

const ContentMetadata = ({ content }) => {
    const tags = [], meta = []

    if (content.episode_metadata) {
        setTags(content.episode_metadata, tags)
        setEpisodeMetadata(content.episode_metadata, meta)
    } else if (content.series_metadata) {
        setTags(content.series_metadata, tags)
        setSerieMetadata(content.series_metadata, meta)
    } else if (content.genres) {
        content.genres.forEach(val => tags.push(val.displayValue))
    }

    return (
        <Row align='baseline space-between'>
            <BodyText size='small' noWrap>
                {tags.join(' | ')}
            </BodyText>
            {meta.length > 0 && (
                <BodyText size='small' noWrap>
                    {meta.join(' | ')}
                </BodyText>
            )}
        </Row>
    )
}

const HomeContentBanner = ({ content }) => {
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {[{source: String, size: {width: Number, height: Number}}, Function]} */
    const [image, setImage] = useState(getImagePerResolution({}))
    /** @type {{current: HTMLElement}} */
    const compRef = useRef(null)
    let title = content.title

    if (content.type === 'episode' && content.episode_metadata && content.episode_metadata.series_title) {
        title = content.episode_metadata.series_title
    } else if (content.type === 'musicArtist') {
        title = content.name
    }

    useEffect(() => {
        if (compRef && compRef.current) {
            const boundingRect = compRef.current.getBoundingClientRect();
            setImage(getImagePerResolution({ height: boundingRect.height, width: boundingRect.width, content }))
        }
    }, [compRef, content, getImagePerResolution])

    return (
        <Row className={css.homeContentBanner} >
            <Cell size="50%">
                <Heading size="large">
                    {title}
                </Heading>
                <ContentMetadata content={content} />
                <BodyText size='small'>
                    {content.description}
                </BodyText>
            </Cell>
            <Cell ref={compRef}>
                {image.source &&
                    <Image className={css.poster} src={image.source}
                        sizing='fill' style={{ width: '100%', height: '100%' }} />
                }
            </Cell>
        </Row>
    )
}

HomeContentBanner.propTypes = {
    content: PropTypes.object.isRequired,
}

export default HomeContentBanner
