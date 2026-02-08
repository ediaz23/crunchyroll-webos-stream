
import { useCallback, useState, useEffect, useMemo } from 'react'
import { Cell, Row, Column } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import Input from '@enact/moonstone/Input'
import Dropdown from '@enact/moonstone/Dropdown'
import PropTypes from 'prop-types'

import CategoryList from './CategoryList'
import ContentGridItems from './ContentGridItems'
import css from './ContentGrid.module.less'
import { dropdownKeydown } from '../SelectLanguage'
import api from '../../api'
import { useContentList, useOrderOptions, useViewModes } from '../../hooks/contentList'
import { $L } from '../../hooks/language'


/**
 * @typedef SearchOptions
 * @type {Object}
 * @property {Number} quantity
 * @property {Boolean} ratings
 * @property {Boolean} noMock
 * @property {'all' | 'sub' | 'dub'} viewMode
 * @property {String} type
 * @property {String} contentKey
 * @property {String} category
 * @property {String} seasonTag
 * @property {String} sort
 * @property {String} query
 * @property {import('crunchyroll-js-api').Types.FetchConfig} fnConfig
 */

/**
 * All content grid and search
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile current profile
 * @param {String} obj.title title for view
 * @param {String} obj.contentKey key to identify and reload view
 * @param {String} obj.contentType type of content to show, series, movies, etc
 * @param {String} obj.engine Engine to search, can be search or browse
 * @param {Boolean} obj.noCategory Not show category
 */
const ContentGrid = ({ profile, title, contentKey, contentType, engine = 'browse', noCategory, ...rest }) => {

    const { contentList, quantity, autoScroll, delay,
        mergeContentList, changeContentList, onFilter,
        viewBackup, viewBackupRef, navigateContent,
    } = useContentList(contentKey)

    /** @type {[String, Function]} */
    const [category, setCategory] = useState(viewBackup?.category || 'all')
    /** @type {[String, Function]} */
    const [query, setQuery] = useState(viewBackup?.query || '')
    const [sort, orderLabels, orderStr, onSelectOrder] = useOrderOptions(viewBackup?.sort || 'popularity', onFilter)
    const [viewMode, viewModeLabels, viewModeStr, onSelectViewMode] = useViewModes(viewBackup?.viewMode, onFilter)
    /** @type {SearchOptions} */
    const options = useMemo(() => {
        return {
            quantity,
            ratings: true,
            noMock: true,
            type: contentType,
            contentKey,
            category: category !== 'all' ? [category] : [],
            sort,
            query,
            viewMode,
        }
    }, [category, contentType, sort, query, contentKey, quantity, viewMode])

    /** @type {Function} */
    const onSearch = useCallback(({ value }) => {
        setQuery(value)
        onFilter({ delay: 3 * 1000 })  // 3 seconds
    }, [setQuery, onFilter])

    /** @type {Function} */
    const onLoad = useCallback((index) => {
        if (mergeContentList(false, index)) {
            if (engine === 'search') {
                api.discover.search(profile, { ...options, start: index }).then(res => {
                    if (res.total) {
                        mergeContentList(res.data[0].items || [], index)
                    } else {
                        mergeContentList([], index)
                    }
                })
            } else {
                api.discover.getBrowseAll(profile, { ...options, start: index }).then(
                    res => mergeContentList(res.data || [], index)
                )
            }
        }
    }, [engine, options, profile, mergeContentList])

    /** @type {Function} */
    const setLocalContent = useCallback(newContent => {
        /** backup all state to restore later */
        viewBackupRef.current = { category, query }
        navigateContent(newContent)
    }, [navigateContent, viewBackupRef, category, query])

    useEffect(() => {
        let delayDebounceFn = undefined
        if (delay >= 0) {
            changeContentList(null)
            delayDebounceFn = setTimeout(() => {
                if (engine === 'search') {
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
                } else {
                    api.discover.getBrowseAll(profile, options).then(
                        res => changeContentList([
                            ...res.data,
                            ...new Array(res.total - res.data.length)
                        ])
                    )
                }
            }, delay)
        }
        return () => clearTimeout(delayDebounceFn)
    }, [profile, changeContentList, options, contentKey, delay, engine])

    useEffect(() => {  // initializing
        onFilter({ delay: 0 })
    }, [profile, changeContentList, onFilter, contentKey])

    return (
        <Row className={css.ContentGrid} {...rest}>
            <Column>
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
                        <Cell shrink>
                            <Dropdown title={$L('Order')}
                                selected={orderLabels.findIndex(i => i.key === sort)}
                                width='small'
                                onSelect={onSelectOrder}
                                onKeyDown={dropdownKeydown}
                                showCloseButton>
                                {orderStr}
                            </Dropdown>
                        </Cell>
                        <Cell shrink>
                            <Dropdown title={$L('Presentation')}
                                selected={viewModeLabels.findIndex(i => i.key === viewMode)}
                                width='small'
                                onSelect={onSelectViewMode}
                                onKeyDown={dropdownKeydown}
                                showCloseButton>
                                {viewModeStr}
                            </Dropdown>
                        </Cell>
                    </Row>
                </Cell>
                <Cell grow>
                    <Row className={css.scrollerContainer}>
                        {!noCategory &&
                            <Cell size="20%">
                                <CategoryList
                                    category={category}
                                    setCategory={setCategory}
                                    setDelay={onFilter} />
                            </Cell>
                        }
                        <Cell grow>
                            <ContentGridItems
                                type={contentKey}
                                contentList={contentList}
                                load={onLoad}
                                onSelect={setLocalContent}
                                autoScroll={autoScroll} />
                        </Cell>
                    </Row>
                </Cell>
            </Column>
        </Row>
    )
}

ContentGrid.propTypes = {
    profile: PropTypes.object.isRequired,
    title: PropTypes.string.isRequired,
    contentKey: PropTypes.string.isRequired,
    contentType: PropTypes.string,
    engine: PropTypes.string,
    noCategory: PropTypes.bool
}

export default ContentGrid
