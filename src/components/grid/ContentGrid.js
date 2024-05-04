
import { useCallback, useState, useEffect, useMemo } from 'react'
import { Cell, Row, Column } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import Input from '@enact/moonstone/Input'
import Spinner from '@enact/moonstone/Spinner'
import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import CategoryList from './CategoryList'
import ContentGridItems from './ContentGridItems'
import api from '../../api'
import withContentList from '../../hooks/contentList'
import css from './ContentGrid.module.less'


/**
 * @todo keep search after navegate?
 * All content grid and search
 * @param {Object} obj
 * @param {Object} obj.profile current profile
 * @param {String} obj.contentKey key to identify and reload view
 * @param {String} obj.title title for view
 * @param {String} obj.contentType type of content to show, series, movies, etc
 * @param {String} obj.engine Engine to search, can be search or browse
 * @param {Boolean} obj.noCategory Not show category
 * @param {Boolean} obj.noSearch Not show input
 * @param {Array<Object>} obj.contentList List of content to show
 * @param {Boolean} obj.loading loading state
 * @param {Function} obj.setLoading setState function for loading
 * @param {Function} obj.changeContentList set content list array
 * @param {Function} obj.mergeContentList merge content list array
 * @param {Function} obj.quantity quantity to search
 */
const ContentGrid = ({
    profile, contentKey, title, contentType,
    contentList, loading, setLoading, changeContentList, mergeContentList, quantity,
    engine, noCategory, noSearch,
    ...rest }) => {

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

    const options = useMemo(() => {
        return {
            quantity,
            ratings: true,
            noMock: true,
            type: contentType,
            contentKey,
            category: category !== 'all' ? [category] : [],
            seasonTag: season ? season.id : undefined,
            sort,
            query,
        }
    }, [category, season, contentType, sort, query, contentKey, quantity])

    const onSearch = useCallback(({ value }) => {
        setDelay(2 * 1000)  // 2 seconds
        setQuery(value)
    }, [setQuery, setDelay])

    const onLoad = useCallback((index) => {
        if (index % options.quantity === 0) {
            if (contentList[index] === undefined) {
                mergeContentList(false, index)
                if (engine === 'search') {
                    api.discover.search(profile, { ...options, start: index })
                        .then(res => mergeContentList(res.data[0].items, index))
                } else {
                    api.discover.getBrowseAll(profile, { ...options, start: index })
                        .then(res => mergeContentList(res.data, index))
                }
            }
        }
    }, [engine, options, profile, contentList, mergeContentList])

    useEffect(() => {
        let delayDebounceFn = undefined
        if (delay >= 0) {
            delayDebounceFn = setTimeout(() => {
                setLoading(true)
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
                        changeContentList([
                            ...res.data,
                            ...new Array(res.total - res.data.length)
                        ])
                    })
                }
            }, delay)
        }
        return () => clearTimeout(delayDebounceFn)
    }, [profile, changeContentList, options, setLoading, contentKey, delay, engine])

    useEffect(() => {  // initializing
        setDelay(0)
        return () => {
            setDelay(-1)
            setSeason(undefined)
            setQuery('')
            setCategory('all')
        }
    }, [profile, contentKey])

    return (
        <Row className={css.ContentGrid} {...rest}>
            <Column>
                <Cell shrink>
                    <Row>
                        <Cell shrink>
                            <Heading>
                                {title} {season && season.localization.title}
                            </Heading>
                        </Cell>
                        {!noSearch &&
                            <Cell shrink>
                                <Input placeholder={$L('Search')}
                                    value={query}
                                    onChange={onSearch}
                                    iconAfter="search" />
                            </Cell>
                        }
                    </Row>
                </Cell>
                <Cell grow>
                    <Row className={css.scrollerContainer}>
                        {!noCategory &&
                            <Cell size="20%">
                                <CategoryList
                                    category={category}
                                    setCategory={setCategory}
                                    setDelay={setDelay} />
                            </Cell>
                        }
                        <Cell grow >
                            {loading &&
                                <Column align='center center'>
                                    <Spinner />
                                </Column>
                            }
                            {!loading &&
                                <ContentGridItems
                                    contentList={contentList}
                                    load={onLoad} />
                            }
                        </Cell>
                    </Row>
                </Cell>
            </Column>
        </Row>
    )
}

ContentGrid.propTypes = {
    profile: PropTypes.object.isRequired,
    contentKey: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    contentType: PropTypes.string,
    engine: PropTypes.string,
    noCategory: PropTypes.bool
}

ContentGrid.defaultProps = {
    engine: 'browse'
}

const ContentGridList = withContentList(ContentGrid)

export default ContentGridList
