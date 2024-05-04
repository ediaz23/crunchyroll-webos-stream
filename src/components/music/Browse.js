
import { useCallback, useState, useEffect, useMemo } from 'react'
import { Column, Cell, Row } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import Input from '@enact/moonstone/Input'
import Spinner from '@enact/moonstone/Spinner'
import PropTypes from 'prop-types'

import { useSetRecoilState } from 'recoil'

import { homeViewReadyState } from '../../recoilConfig'
import { $L } from '../../hooks/language'
import HomeFeed from '../home/Feed'
import ContentGridItems from '../grid/ContentGridItems'
import api from '../../api'
import useMergeContentList from '../../hooks/mergeContentList'


const MusicBrowse = ({ profile, contentKey, title, contentType, musicFeed, setMusicFeed, ...rest }) => {
    /** @type {Function} */
    const setHomeViewReady = useSetRecoilState(homeViewReadyState)
    /** @type {[Array<Object>, Function]} */
    const [contentList, setContentList] = useState([])
    /** @type {[Number, Function]} */
    const [delay, setDelay] = useState(-1)
    /** @type {[String, Function]} */
    const [query, setQuery] = useState('')
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)
    /** @type {String} */
    const sort = useMemo(() => query === '' ? 'popularity' : 'alphabetical', [query])
    const onScroll = useMemo(() => () => { }, [])

    const options = useMemo(() => {
        return {
            quantity: 50,
            ratings: true,
            noMock: true,
            type: contentType,
            contentKey,
            sort,
            query,
        }
    }, [contentType, sort, query, contentKey])

    const onSearch = useCallback(({ value }) => {
        setDelay(2 * 1000)  // 2 seconds
        setQuery(value)
    }, [setQuery, setDelay])

    const mergeContentList = useMergeContentList(setContentList, options.quantity)

    const onLoad = useCallback((index) => {
        if (index % options.quantity === 0) {
            if (contentList[index] === undefined) {
                mergeContentList(false, index)
                api.discover.search(profile, { ...options, start: index })
                    .then(res => mergeContentList(res.data[0].items, index))
            }
        }
    }, [options, profile, contentList, mergeContentList])

    const changeContentList = useCallback((newList) => {
        setContentList(newList)
        setLoading(false)
        setHomeViewReady(true)
    }, [setContentList, setLoading, setHomeViewReady])

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
    }, [profile, contentKey, delay, options, changeContentList, setLoading])

    useEffect(() => {  // initializing
        setDelay(0)
        return () => {
            setDelay(-1)
            setQuery('')
            setContentList([])
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
                        autoScroll={false}
                        onScroll={onScroll} />
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

export default MusicBrowse
