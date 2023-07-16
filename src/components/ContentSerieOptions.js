
import { useCallback } from 'react'
import Spotlight from '@enact/spotlight'

import Heading from '@enact/moonstone/Heading'
import BodyText from '@enact/moonstone/BodyText'
import Scroller from '@enact/moonstone/Scroller'
import Item from '@enact/moonstone/Item'
import Icon from '@enact/moonstone/Icon'
import IconButton from '@enact/moonstone/IconButton'
import $L from '@enact/i18n/$L'

import back from '../back'
import css from './ContentSerie.module.less'


const useChangeActivity = (setIndex, index) => {
    return () => {
        back.pushHistory({ doBack: () => { setIndex(0) } })
        setIndex(index)
    }
}


/**
 * @param obj
 * @param {Object} obj.episode
 * @param {Number} obj.rating
 * @param {Function} obj.updateRating
 * @param {Function} obj.setIndex
 */
const ContentSerieOptions = ({ episode, rating, updateRating, setIndex, ...rest }) => {

    const setFocus = useCallback(() => { Spotlight.focus('#play-serie') }, [])
    const moreEpisodes = useChangeActivity(setIndex, 1)
    const changeSubs = useChangeActivity(setIndex, 2)

    if (!episode) { return (<div {...rest} />) }

    const season = episode.episode_metadata.season_number || 0
    const episodeNumber = episode.episode_metadata.episode_number || 0
    const subtitle = `${$L('Episode')} ${episodeNumber}: ${episode.title}`
    const watch = `${$L('Watch')} ${$L('Season')} ${season}: ${$L('E')} ${episodeNumber}`

    return (
        <div {...rest}>
            <Heading size='small' spacing="small">
                {subtitle}
            </Heading>
            <BodyText size='small'>
                {episode.description}
            </BodyText>
            <BodyText component='div' size='small'>
                {Array.from({ length: 5 }, (_v, i) =>
                    <IconButton size="small" key={i} data-star={i}
                        onClick={updateRating}>
                        {(i < rating) ? 'star' : 'hollowstar'}
                    </IconButton>
                )}
            </BodyText>
            <Scroller direction='vertical' horizontalScrollbar='hidden'
                verticalScrollbar='visible' className={css.scrollerOption}>
                <div className={css.container}>
                    <Item id="play-serie" componentRef={setFocus}>
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
                </div>
            </Scroller>
        </div>
    )
}

export default ContentSerieOptions
