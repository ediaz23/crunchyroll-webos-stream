
import { useEffect, useCallback } from 'react'
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
import back from '../../back'
import css from './Series.module.less'


const useChangeActivity = (setIndex, index) => {
    return () => {
        back.pushHistory({ doBack: () => { setIndex(0) } })
        setIndex(index)
    }
}

/**
 * @param {{
    series: Object,
    episode: Object,
    rating: Number,
    updateRating: Function,
    setIndex: Function
 }}
 */
const SeriesOptions = ({ series, episode, rating, updateRating, setIndex, selectEpisode, ...rest }) => {

    const moreEpisodes = useChangeActivity(setIndex, 1)
    const changeSubs = useChangeActivity(setIndex, 2)
    const season = episode.episode_metadata.season_number || 0
    const episodeNumber = episode.episode_metadata.episode_number || 0
    const subtitle = `${$L('Episode')} ${episodeNumber}: ${episode.title}`
    const watch = `${$L('Watch')} ${$L('Season')} ${season}: ${$L('E')} ${episodeNumber}`
    const playEpisode = useCallback(() => {
        selectEpisode(episode)
    }, [selectEpisode, episode])

    useEffect(() => {
        Spotlight.focus('#play-serie')
    }, [])

    return (
        <Row {...rest}>
            <Cell size="49%">
                <ContentHeader content={series} />
                <Heading size='small' spacing='small' className={css.firstData}>
                    {subtitle}
                </Heading>
                <div className={css.scrollerContainer}>
                    <Scroller direction='vertical' horizontalScrollbar='hidden'
                        verticalScrollbar='auto'>
                        <BodyText size='small'>
                            {episode.description}
                        </BodyText>
                    </Scroller>
                </div>
                <BodyText component='div' size='small'>
                    {Array.from({ length: 5 }, (_v, i) =>
                        <IconButton size="small" key={i} data-star={i}
                            onClick={updateRating}>
                            {(i < rating) ? 'star' : 'hollowstar'}
                        </IconButton>
                    )}
                </BodyText>
                <div className={css.scrollerContainer}>
                    <Scroller direction='vertical' horizontalScrollbar='hidden'
                        verticalScrollbar='visible'>
                        <Item id='play-serie' onClick={playEpisode}>
                            <Icon>play</Icon>
                            <span>{watch}</span>
                        </Item>
                        <Item onClick={moreEpisodes}>
                            <Icon>series</Icon>
                            <span>{$L('Episodes and more')}</span>
                        </Item>
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

SeriesOptions.propTypes = {
    series: PropTypes.object.isRequired,
    episode: PropTypes.object.isRequired,
    rating: PropTypes.number.isRequired,
    updateRating: PropTypes.func.isRequired,
    setIndex: PropTypes.func.isRequired,
    selectEpisode: PropTypes.func.isRequired,
}

export default SeriesOptions
