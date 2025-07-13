
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
 * @param {{id: Number, items: Array<import('../hooks/homefeedWorker').HomefeedItem>}} obj.musicFeed Music feed array
 */
const MusicBrowse = ({ profile, title, musicFeed, ...rest }) => {

    const { contentList, quantity, autoScroll, delay,
        mergeContentList, changeContentList, onFilter,
        backState, viewBackupRef, setContentNavigate,
    } = useContentList(`musicBrowse-${musicFeed.id}`)

    /** @type {[String, Function]} */
    const [query, setQuery] = useState(backState?.query || '')
    /** @type {String} */
    const sort = useMemo(() => query === '' ? 'popularity' : 'alphabetical', [query])
    /** @type {import('../grid/ContentGrid').SearchOptions} */
    const options = useMemo(() => {
        const contentKey = 'music'
        return {
            quantity,
            ratings: true,
            noMock: true,
            type: contentKey,
            contentKey,
            sort,
            query,
        }
    }, [sort, query, quantity])

    /** @type {Function} */
    const onSearch = useCallback(({ value }) => {
        setQuery(value)
        onFilter({ delay: 3 * 1000 })  // 3 seconds
    }, [setQuery, onFilter])

    /** @type {Function} */
    const onLoad = useCallback((index) => {
        if (mergeContentList(false, index)) {
            api.discover.search(profile, { ...options, start: index }).then(res => {
                if (res.total) {
                    mergeContentList(res.data[0].items, index)
                }
            })
        }
    }, [options, profile, mergeContentList])

    /** @type {Function} */
    const setLocalContent = useCallback(newContent => {
        /** backup all state to restore later */
        viewBackupRef.current = { query }
        setContentNavigate(newContent)
    }, [setContentNavigate, viewBackupRef, query])

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
    }, [profile, changeContentList, options, delay])

    useEffect(() => {  // initializing
        onFilter({ delay: 0 })
    }, [profile, changeContentList, onFilter])

    return (
        <Column style={{ width: '100%' }} {...rest}>
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
                            iconAfter="search" />
                    </Cell>
                </Row>
            </Cell>
            <Cell grow style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
                {query === '' &&
                    <HomeFeed
                        profile={profile}
                        homeFeed={musicFeed}
                        feedType='music' />
                }
                {query !== '' &&
                    <ContentGridItems
                        type='music'
                        contentList={contentList}
                        load={onLoad}
                        onSelect={setLocalContent}
                        autoScroll={autoScroll} />
                }
            </Cell>
        </Column>
    )
}

MusicBrowse.propTypes = {
    profile: PropTypes.object.isRequired,
    title: PropTypes.string.isRequired,
    musicFeed: PropTypes.shape({
        id: PropTypes.number.isRequired,
        items: PropTypes.arrayOf(PropTypes.object).isRequired,
    }).isRequired,
}

export default MusicBrowse
