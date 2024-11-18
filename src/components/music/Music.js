
import { useCallback, useState, useEffect, useMemo } from 'react'
import { Column, Cell, Row } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import Input from '@enact/moonstone/Input'
import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import HomeFeed from '../home/Feed'
import ContentGridItems from '../grid/ContentGridItems'
import api from '../../api'
import useContentList from '../../hooks/contentList'


/**
 * Music view
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile current profile
 * @param {String} obj.title title for view
 * @param {String} obj.contentKey key to identify and reload view
 * @param {String} obj.contentType type of content to show, series, movies, etc
 * @param {Array<Object>} obj.musicFeed Music feed array
 * @param {Function} obj.setMusicFeed setState for musicFeed
 */
const MusicBrowse = ({
    profile, title, contentKey, contentType = 'music', musicFeed, setMusicFeed, ...rest }) => {

    const { contentList, quantity, autoScroll, delay,
        mergeContentList, changeContentList, onLeave, onFilter,
        contentListBak, optionBak,
    } = useContentList('music_browse')

    /** @type {[String, Function]} */
    const [query, setQuery] = useState(optionBak.query || '')
    /** @type {String} */
    const sort = useMemo(() => query === '' ? 'popularity' : 'alphabetical', [query])
    /** @type {import('../grid/ContentGrid').SearchOptions} */
    const options = useMemo(() => {
        return {
            quantity,
            ratings: true,
            noMock: true,
            type: contentType,
            contentKey,
            sort,
            query,
        }
    }, [contentType, sort, query, contentKey, quantity])

    /** @type {Function} */
    const onSearch = useCallback(({ value }) => {
        setQuery(value)
        onFilter({ delay: 3 * 1000 })  // 3 seconds
    }, [setQuery, onFilter])

    /** @type {Function} */
    const onLoad = useCallback((index) => {
        if (mergeContentList(false, index)) {
            api.discover.search(profile, { ...options, start: index })
                .then(res => {
                    if (res.total) {
                        mergeContentList(res.data[0].items, index)
                    }
                })
        }
    }, [options, profile, mergeContentList])

    /** @type {Function} */
    const onLeaveView = useCallback(() => {
        onLeave({ query })
    }, [onLeave, query])

    useEffect(() => {
        let delayDebounceFn = undefined
        if (delay >= 0) {
            changeContentList(null)
            delayDebounceFn = setTimeout(() => {
                if (options.query !== '') {
                    api.discover.search(profile, options).then(res => {
                        if (res.total) {
                            changeContentList([
                                ...res.data[0].items,
                                ...new Array(res.data[0].count - res.data[0].items.length)
                            ])
                        } else {
                            changeContentList([])
                        }
                    })
                } else {
                    changeContentList([])
                }
            }, delay)
        }
        return () => clearTimeout(delayDebounceFn)
    }, [profile, changeContentList, options, contentKey, delay])

    useEffect(() => {  // initializing
        if (contentListBak) {
            changeContentList(contentListBak)
        } else {
            onFilter({ delay: 0, scroll: true })
        }
    }, [profile, contentListBak, changeContentList, onFilter, contentKey])

    return (
        <Column id="music-feed" style={{ width: '100%' }} {...rest}>
            <Cell shrink>
                <Row>
                    <Cell shrink>
                        <Heading>
                            {title}
                        </Heading>
                    </Cell>
                    <Cell shrink>
                        <Input placeholder={$L('Search')}
                            value={query}
                            onChange={onSearch}
                            iconAfter="search"
                            style={{ paddingRight: '2rem' }} />
                    </Cell>
                </Row>
            </Cell>
            <Cell grow style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', height: '90%' }}>
                {query === '' &&
                    <HomeFeed
                        profile={profile}
                        homeFeed={musicFeed}
                        setHomeFeed={setMusicFeed}
                        type='music' />
                }
                {query !== '' &&
                    <ContentGridItems
                        contentList={contentList}
                        load={onLoad}
                        onLeave={onLeaveView}
                        autoScroll={autoScroll} />
                }
            </Cell>
        </Column>
    )
}

MusicBrowse.propTypes = {
    profile: PropTypes.object.isRequired,
    contentKey: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    musicFeed: PropTypes.arrayOf(PropTypes.object).isRequired,
    setMusicFeed: PropTypes.func.isRequired,
    contentType: PropTypes.string,
}

export default MusicBrowse
