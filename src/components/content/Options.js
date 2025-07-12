
import { useEffect, useCallback, useState, useMemo } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import BodyText from '@enact/moonstone/BodyText'
import IconButton from '@enact/moonstone/IconButton'
import PropTypes from 'prop-types'

import OptionsList from './OptionsList'
import MusicList from './MusicList'
import SimilarList from './SimilarList'
import Scroller from '../../patch/Scroller'
import { ContentHeader } from '../home/ContentBanner'
import api from '../../api'
import css from './ContentDetail.module.less'
import { useViewBackup } from '../../hooks/viewBackup'


/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {{content: Object, setContent: Function}} obj.contentState
 * @param {{moreEpisodes: Function, changeAudio: Function}} obj.setFunctions
 */
const Options = ({ profile, contentState, setFunctions, ...rest }) => {
    const [backState, viewBackupRef] = useViewBackup('content-options')
    const { content, setContent: setContentSuper } = contentState
    /** @type {[String, Function]} */
    const [optionIndex, setOptionIndex] = useState(backState?.optionIndex)
    /** @type {[Number, Function]} */
    const [rating, setRating] = useState(0)
    /** @type {[{total: Number}, Function]} */
    const [music, setMusic] = useState({ total: 0 })
    /** @type {[{total: Number}, Function]} */
    const [similar, setSimilar] = useState({ total: 0 })
    /** @type {[String, Function]}  */
    const [subtitle, setSubtitle] = useState('\u00A0')
    /** @type {String} */
    const description = useMemo(() => content.description || '', [content])
    /** @type {Function} */
    const setContent = useCallback(newContent => {
        /** backup all state to restore later */
        viewBackupRef.current = { optionIndex }
        setContentSuper(newContent)
    }, [optionIndex, viewBackupRef, setContentSuper])

    /** @type {Function} */
    const updateRating = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const star = parseInt(target.dataset.star) + 1
        api.review.updateRating(profile, {
            contentId: content.id,
            contentType: content.type,
            rating: `${star}s`
        }).then(() => setRating(star))
    }, [profile, content])

    useEffect(() => {
        api.review.getRatings(profile, { contentId: content.id, contentType: content.type, }).then(ratingRes => {
            if (ratingRes) {
                setRating(parseInt(ratingRes.rating.trimEnd('s')))
            }
        })
    }, [profile, content])

    return (
        <Row align='start space-between' {...rest}>
            <Row style={{ width: '100%' }}>
                <Cell size='49%' style={{ overflow: 'hidden' }}>
                    <Column style={{ height: '100%', width: '100%' }}>
                        <Cell size='32%'>
                            <ContentHeader content={content} />
                            <Heading size='small' spacing='small' className={css.firstData}>
                                {subtitle}
                            </Heading>
                        </Cell>
                        <Cell size='15%'>
                            <div className={css.scrollerContainer}>
                                <Scroller
                                    direction='vertical'
                                    horizontalScrollbar='hidden'
                                    verticalScrollbar='auto'
                                    focusableScrollbar>
                                    <BodyText size='small'>
                                        {description}
                                    </BodyText>
                                </Scroller>
                            </div>
                        </Cell>
                        <Cell size="13%">
                            <BodyText component='div' size='small' style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                                {Array.from({ length: 5 }, (_v, i) =>
                                    <IconButton size='small' key={i} data-star={i}
                                        onClick={updateRating}>
                                        {(i < rating) ? 'star' : 'hollowstar'}
                                    </IconButton>
                                )}
                            </BodyText>
                        </Cell>
                        <Cell size='40%'>
                            <OptionsList
                                profile={profile}
                                music={music}
                                similar={similar}
                                contentState={{
                                    content,
                                    setContent
                                }}
                                optionIndexState={{
                                    optionIndex,
                                    setOptionIndex
                                }}
                                setFunctions={{
                                    ...setFunctions,
                                    setSubtitle,
                                }} />
                        </Cell>
                    </Column>
                </Cell>
                <Cell size='49%' style={{ overflow: 'hidden' }}>
                    {optionIndex === 'music' &&
                        <MusicList
                            profile={profile}
                            onLoadData={setMusic}
                            contentState={{
                                content,
                                setContent
                            }} />
                    }
                    {optionIndex === 'similar' &&
                        <SimilarList
                            profile={profile}
                            onLoadData={setSimilar}
                            contentState={{
                                content,
                                setContent
                            }}
                        />
                    }
                </Cell>
            </Row>
        </Row>
    )
}

Options.propTypes = {
    profile: PropTypes.object.isRequired,
    contentState: PropTypes.shape({
        content: PropTypes.object.isRequired,
        setContent: PropTypes.func.isRequired,
    }).isRequired,
    setFunctions: PropTypes.shape({
        moreEpisodes: PropTypes.func.isRequired,
        changeAudio: PropTypes.func.isRequired,
    }).isRequired,
}

export default Options
