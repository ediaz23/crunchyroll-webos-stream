
import { useCallback, useState, useEffect, useMemo } from 'react'
import { Column, Cell, Row } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import Input from '@enact/moonstone/Input'
import Spinner from '@enact/moonstone/Spinner'
import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import MusicFeed from './Feed'
import ContentGridItems from '../grid/ContentGridItems'
import api from '../../api'


const MusicBrowse = ({ profile, contentKey, title, contentType, musicfeed, ...rest }) => {

    /** @type {[Array<Object>, Function]} */
    const [contentList, setContentList] = useState([])
    /** @type {[Object, Function]} */
    const [loadingItem, setLoadingItem] = useState({})
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
        setQuery(value)
        setDelay(1000)
    }, [setQuery, setDelay])

    const onLoad = useCallback(async (index) => {
        if (index % options.quantity === 0) {
            if (loadingItem[index] === undefined) {
                setLoadingItem(prev => { prev[index] = false; return { ...prev } })
                const res = await api.discover.search(profile, { ...options, start: index })
                setContentList(prevArray => [
                    ...prevArray.slice(0, index),
                    ...res.data[0].items,
                    ...prevArray.slice(index + res.data[0].items.length)
                ])
            }
        }
    }, [loadingItem, options, profile])

    const changeContentList = useCallback((newList) => {
        setLoadingItem({})
        setContentList(newList)
    }, [setLoadingItem, setContentList])

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
                        setLoading(false)
                    })
                } else {
                    changeContentList([])
                    setLoading(false)
                }
            }, delay)
        }
        return () => clearTimeout(delayDebounceFn)
    }, [profile, contentKey, delay, options, changeContentList, setLoading])

    useEffect(() => {  // initializing
        if (contentKey !== 'simulcast') {
            setDelay(0)
        }
        return () => {
            setDelay(-1)
            setQuery('')
            setContentList([])
            setLoadingItem({})
        }
    }, [profile, contentKey])

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
            <Cell grow style={{paddingTop: '0.5rem', paddingBottom: '0.5rem'}}>
                {loading &&
                    <Column align='center center'>
                        <Spinner />
                    </Column>
                }
                {!loading && query === '' &&
                    <MusicFeed
                        profile={profile}
                        musicfeed={musicfeed} />
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
    musicfeed: PropTypes.arrayOf(PropTypes.object).isRequired,
    contentType: PropTypes.string,
}

MusicBrowse.defaultProps = {
    contentType: 'music'
}

export default MusicBrowse
