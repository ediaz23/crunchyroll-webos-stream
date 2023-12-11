
import { useEffect, useCallback, useState, useMemo } from 'react'
import { Row, Cell } from '@enact/ui/Layout'
import Spotlight from '@enact/spotlight'

import Heading from '@enact/moonstone/Heading'
import BodyText from '@enact/moonstone/BodyText'
import Item from '@enact/moonstone/Item'
import Icon from '@enact/moonstone/Icon'
import IconButton from '@enact/moonstone/IconButton'
import $L from '@enact/i18n/$L'
import PropTypes from 'prop-types'

import Scroller from '../../patch/Scroller'
import { ContentHeader } from '../home/ContentBanner'
import api from '../../api'
import back from '../../back'
import css from './ContentDetail.module.less'


const useChangeActivity = (setIndex, index) => {
    return () => {
        back.pushHistory({ doBack: () => { setIndex(0) } })
        setIndex(index)
    }
}

/**
 * @param {{
    profile: Object,
    content: Object,
    episode: Object,
    rating: Number,
    updateRating: Function,
    setIndex: Function,
    setContentToPlay: Function,
 }}
 */
const Options = ({ profile, content, rating, updateRating, setIndex, setContentToPlay, ...rest }) => {

    /** @type {[Object, Function]} */
    const [episode, setEpisode] = useState(null)
    /** @type {{contentId: String, contentType: String}} */
    const contentShort = useMemo(() => {
        return content ? { contentId: content.id, contentType: content.type } : {}
    }, [content])
    /** @type {{watch: String, description: String, subtitle: String}} */
    const { watch, description, subtitle } = useMemo(() => {
        let subtitleTmp = '', descriptionTmp = '', watchTmp = ''

        if (episode) {
            const season = episode.episode_metadata.season_number || 0
            const episodeNumber = episode.episode_metadata.episode_number || 0
            descriptionTmp = episode.description
            watchTmp = `${$L('Watch')} ${$L('Season')} ${season}: ${$L('E')} ${episodeNumber}`
            subtitleTmp = `${$L('Episode')} ${episodeNumber}: ${episode.title}`
        } else {
            descriptionTmp = content.description
            watchTmp = $L('Watch')
        }
        return { watch: watchTmp, description: descriptionTmp, subtitle: subtitleTmp }
    }, [content, episode])
    /** @type {Function} */
    const moreEpisodes = useChangeActivity(setIndex, 1)
    /** @type {Function} */
    const changeSubs = useChangeActivity(setIndex, 2)
    /** @type {Function} */
    const playEpisode = useCallback(() => {
        if (episode) {
            setContentToPlay(episode)
        } else {
            setContentToPlay(content)
        }
    }, [setContentToPlay, content, episode])

    useEffect(() => {
        if (content && content.type === 'series') {
            api.discover.getNext(profile, contentShort).then(nextEp => {
                if (nextEp && nextEp.total > 0) {
                    setEpisode(nextEp.data[0])
                }
            })
        }
    }, [content, profile, contentShort])

    useEffect(() => {
        Spotlight.focus('#play')
    }, [])

    return (
        <Row {...rest}>
            <Cell size='49%'>
                <ContentHeader content={content} />
                {subtitle &&
                    <Heading size='small' spacing='small' className={css.firstData}>
                        {subtitle}
                    </Heading>
                }
                <div className={css.scrollerContainer}>
                    <Scroller direction='vertical' horizontalScrollbar='hidden'
                        verticalScrollbar='auto'>
                        <BodyText size='small'>
                            {description}
                        </BodyText>
                    </Scroller>
                </div>
                <BodyText component='div' size='small'>
                    {Array.from({ length: 5 }, (_v, i) =>
                        <IconButton size='small' key={i} data-star={i}
                            onClick={updateRating}>
                            {(i < rating) ? 'star' : 'hollowstar'}
                        </IconButton>
                    )}
                </BodyText>
                <div className={css.scrollerContainer}>
                    <Scroller direction='vertical' horizontalScrollbar='hidden'
                        verticalScrollbar='visible'>
                        <Item id='play' onClick={playEpisode}>
                            <Icon>play</Icon>
                            <span>{watch}</span>
                        </Item>
                        {content.type === 'series' &&
                            <Item onClick={moreEpisodes}>
                                <Icon>series</Icon>
                                <span>{$L('Episodes and more')}</span>
                            </Item>
                        }
                        <Item onClick={changeSubs}>
                            <Icon>audio</Icon>
                            <span>{$L('Audio and Subtitles')}</span>
                        </Item>
                        <Item>
                            <Icon>denselist</Icon>
                            <span>{$L('Add to my list')}</span>
                        </Item>
                    </Scroller>
                </div>
            </Cell>
        </Row>
    )
}

Options.propTypes = {
    profile: PropTypes.object.isRequired,
    content: PropTypes.object.isRequired,
    rating: PropTypes.number.isRequired,
    updateRating: PropTypes.func.isRequired,
    setIndex: PropTypes.func.isRequired,
    setContentToPlay: PropTypes.func.isRequired,
}

export default Options
