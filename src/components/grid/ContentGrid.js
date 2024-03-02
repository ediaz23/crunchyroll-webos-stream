
import { useCallback, useState, useEffect, useMemo } from 'react'
import { Cell, Row, Column } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import Input from '@enact/moonstone/Input'
import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import SeasonButtons from './SeasonButtons'
import CategoryList from './CategoryList'
import ContentGridItems from './ContentGridItems'
import { TOOLBAR_INDEX } from '../home/Toolbar'
import api from '../../api'
import css from './ContentGrid.module.less'


/**
 * @todo keep search after navegate?
 * All content grid and search
 * @param {Object} obj
 * @param {Object} profile current profile
 * @param {String} obj.contentKey key to identify and reload view
 * @param {String} obj.contentType type of content to show, series, movies, etc
 * @param {String} obj.engine Engine to search, can be search or browse
 * @param {Boolean} obj.noCategory Not show category
 */
const ContentGrid = ({ profile, contentKey, contentType, engine, noCategory, ...rest }) => {
    /** @type {[Array<Object>, Function]} */
    const [contentList, setContentList] = useState([])
    /** @type {[Object, Function]} */
    const [loading, setLoading] = useState({})
    /** @type {[Object, Function]} */
    const [autoScroll, setAutoScroll] = useState(true)
    /** @type {[Number, Function]} */
    const [delay, setDelay] = useState(-1)
    /** @type {[String, Function]} */
    const [category, setCategory] = useState('all')
    /** @type {[String, Function]} */
    const [query, setQuery] = useState('')
    /** @type {[import('./SeasonButtons').Season, Function]} */
    const [season, setSeason] = useState(undefined)
    /** @type {String} */
    const sort = useMemo(() => query === '' ? 'popularity' : 'alphabetical', [query])
    /**
     * @type {{ key: String, label: String, icon: String, index: Number}}
     */
    const action = useMemo(() => {
        const actionTmp = { ...TOOLBAR_INDEX[contentKey] }
        if (season) {
            actionTmp.label = `${actionTmp.label} ${season.localization.title}`
        }
        return actionTmp
    }, [season, contentKey])

    const options = useMemo(() => {
        return {
            quantity: 50,
            ratings: true,
            noMock: true,
            type: contentType,
            contentKey,
            category: category !== 'all' ? [category] : [],
            seasonTag: season ? season.id : undefined,
            sort,
            query,
        }
    }, [category, season, contentType, sort, query, contentKey])

    const onSearch = useCallback(({ value }) => {
        setQuery(value)
        setDelay(1000)
    }, [setQuery, setDelay])

    const onScroll = useCallback(() => setAutoScroll(false), [])

    const onLoad = useCallback(async (index) => {
        if (index % options.quantity === 0) {
            if (loading[index] === undefined) {
                setLoading(prev => { prev[index] = false; return { ...prev } })
                if (engine === 'search') {
                    const res = await api.discover.search(profile, { ...options, start: index })
                    setContentList(prevArray => [
                        ...prevArray.slice(0, index),
                        ...res.data[0].items,
                        ...prevArray.slice(index + res.data[0].items.length)
                    ])
                } else {
                    const res = await api.discover.getBrowseAll(profile, { ...options, start: index })
                    setContentList(prevArray => [
                        ...prevArray.slice(0, index),
                        ...res.data,
                        ...prevArray.slice(index + res.data.length),
                    ])
                }
            }
        }
    }, [engine, loading, options, profile])

    const changeContentList = useCallback((newList) => {
        setLoading({})
        setAutoScroll(true)
        setContentList(newList)
    }, [setLoading, setAutoScroll, setContentList])

    useEffect(() => {
        let delayDebounceFn = undefined
        if (delay >= 0) {
            delayDebounceFn = setTimeout(() => {
                if (engine === 'search') {
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
                } else {
                    api.discover.getBrowseAll(profile, options).then(res => {
                        changeContentList([...res.data, ...new Array(res.total - res.data.length)])
                    })
                }
            }, delay)
        }
        return () => clearTimeout(delayDebounceFn)
    }, [profile, action, contentKey, delay, options, engine, changeContentList])

    useEffect(() => {  // initializing
        if (contentKey !== 'simulcast') {
            setDelay(0)
        }
        return () => {
            setDelay(-1)
            setSeason(undefined)
            setQuery('')
            setCategory('all')
            setContentList([])
            setLoading({})
            setAutoScroll(true)
        }
    }, [profile, contentKey])

    return (
        <Row className={css.ContentGrid} {...rest}>
            {!noCategory &&
                <Cell size="20%">
                    <Heading>
                        {action.label}
                    </Heading>
                    <CategoryList
                        profile={profile}
                        category={category}
                        setCategory={setCategory}
                        setDelay={setDelay} />
                </Cell>
            }
            <Cell grow>
                <Column className={css.grid}>
                    <Cell shrink>
                        <Input placeholder={$L('Search')}
                            value={query}
                            onChange={onSearch}
                            iconAfter="search" />
                    </Cell>
                    <Cell grow>
                        <ContentGridItems
                            contentList={contentList}
                            load={onLoad}
                            autoScroll={autoScroll}
                            onScroll={onScroll} />
                    </Cell>
                    {contentKey === 'simulcast' &&
                        <SeasonButtons
                            profile={profile}
                            contentKey={contentKey}
                            season={season}
                            setSeason={setSeason}
                            setDelay={setDelay} />
                    }
                </Column>
            </Cell>
        </Row>
    )
}

ContentGrid.propTypes = {
    profile: PropTypes.object.isRequired,
    contentKey: PropTypes.string.isRequired,
    contentType: PropTypes.string,
    engine: PropTypes.string,
    noCategory: PropTypes.bool
}

ContentGrid.defaultProps = {
    engine: 'browse'
}

export default ContentGrid
