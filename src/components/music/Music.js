
import { useCallback, useState, useEffect, useMemo } from 'react'
import { Column, Cell, Row } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import Input from '@enact/moonstone/Input'
import Spinner from '@enact/moonstone/Spinner'
import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import HomeFeed from '../home/Feed'
import ContentGridItems from '../grid/ContentGridItems'
import api from '../../api'
import withContentList from '../../hooks/contentList'


/**
 * @todo keep search after navegate?
 * All content grid and search
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile current profile
 * @param {String} obj.contentKey key to identify and reload view
 * @param {String} obj.title title for view
 * @param {String} obj.contentType type of content to show, series, movies, etc
 * @param {Array<Object>} obj.musicFeed Music feed array
 * @param {Function} obj.setMusicFeed setState for musicFeed
 * @param {Array<Object>} obj.contentList List of content to show
 * @param {Boolean} obj.loading loading state
 * @param {Function} obj.setLoading setState function for loading
 * @param {Function} obj.changeContentList set content list array
 * @param {Function} obj.mergeContentList merge content list array
 * @param {Function} obj.quantity quantity to search
 */
const MusicBrowse = ({
    profile, contentKey, title, contentType,
    contentList, loading, setLoading, changeContentList, mergeContentList, quantity,
    musicFeed, setMusicFeed,
    ...rest }) => {
    /** @type {[Number, Function]} */
    const [delay, setDelay] = useState(-1)
    /** @type {[String, Function]} */
    const [query, setQuery] = useState('')
    /** @type {String} */
    const sort = useMemo(() => query === '' ? 'popularity' : 'alphabetical', [query])

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

    const onSearch = useCallback(({ value }) => {
        setDelay(2 * 1000)  // 2 seconds
        setQuery(value)
    }, [setQuery, setDelay])

    const onLoad = useCallback((index) => {
        if (index % options.quantity === 0) {
            if (contentList[index] === undefined) {
                mergeContentList(false, index)
                api.discover.search(profile, { ...options, start: index })
                    .then(res => mergeContentList(res.data[0].items, index))
            }
        }
    }, [options, profile, contentList, mergeContentList])

    useEffect(() => {
        let delayDebounceFn = undefined
        if (delay >= 0) {
            delayDebounceFn = setTimeout(() => {
                setLoading(true)
                if (options.query !== '') {
                    api.discover.search(profile, options).then(res => {
                        changeContentList([
                            ...res.data[0].items,
                            ...new Array(res.data[0].count - res.data[0].items.length)
                        ])
                    })
                } else {
                    changeContentList([])
                }
            }, delay)
        }
        return () => clearTimeout(delayDebounceFn)
    }, [profile, changeContentList, options, setLoading, contentKey, delay])

    useEffect(() => {  // initializing
        setDelay(0)
        return () => {
            setDelay(-1)
            setQuery('')
        }
    }, [profile])

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
                {loading &&
                    <Column align='center center'>
                        <Spinner />
                    </Column>
                }
                {!loading && query === '' &&
                    <HomeFeed
                        profile={profile}
                        homeFeed={musicFeed}
                        setHomeFeed={setMusicFeed}
                        type='music' />
                }
                {!loading && query !== '' &&
                    <ContentGridItems
                        contentList={contentList}
                        load={onLoad}
                        autoScroll={false} />
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

MusicBrowse.defaultProps = {
    contentType: 'music'
}

export default withContentList(MusicBrowse)
