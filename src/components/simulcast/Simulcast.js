
import { useCallback, useState, useEffect, useMemo } from 'react'
import { Cell, Row, Column } from '@enact/ui/Layout'
import Button from '@enact/moonstone/Button'
import LabeledItem from '@enact/moonstone/LabeledItem'
import Dropdown from '@enact/moonstone/Dropdown'
import PropTypes from 'prop-types'

import ContentGridItems from '../grid/ContentGridItems'
import css from '../grid/ContentGrid.module.less'
import { dropdownKeydown } from '../SelectLanguage'
import { $L } from '../../hooks/language'
import api from '../../api'
import useContentList from '../../hooks/contentList'


/**
 * @typedef Season
 * @type {Object}
 * @property {String} id
 * @property {Number} index
 * @property {{title: String, description: String}} localization
 */


/**
 * Simulcast view
 * @TODO add poster for first weeks of season
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile current profile
 * @param {String} obj.title title for view
 */
const Simulcast = ({ profile, title, ...rest }) => {

    const { contentList, quantity, autoScroll, delay,
        mergeContentList, changeContentList, onFilter,
        viewBackup, viewBackupRef, navigateContent,
    } = useContentList('simulcast')

    /** @type {[import('./SeasonButtons').Season, Function]} */
    const [season, setSeason] = useState(viewBackup?.season || undefined)
    /** @type {[Array<Season>, Function]} */
    const [seasons, setSeasons] = useState(viewBackup?.seasons || undefined)
    /** @type {[String, Function]}  */
    const [sort, setOrder] = useState(viewBackup?.sort || 'newly_added')

    /** @type {Array<{key: String, value: String}>} */
    const order = useMemo(() => {
        return [{
            key: 'newly_added',
            value: $L('Newly'),
        }, {
            key: 'popularity',
            value: $L('Popularity'),
        }, {
            key: 'alphabetical',
            value: $L('Alphabetical'),
        }]
    }, [])
    /** @type {Array<String>} */
    const orderStr = useMemo(() => order.map(i => i.value), [order])
    /** @type {import('../grid/ContentGrid').SearchOptions} */
    const options = useMemo(() => {
        return {
            quantity,
            ratings: true,
            noMock: true,
            seasonTag: season && season.id,
            sort,
        }
    }, [season, sort, quantity])

    /** @type {Function} */
    const onSelectOrder = useCallback(({ selected }) => {
        setOrder(order[selected].key)
        onFilter({ delay: 0 })
    }, [order, setOrder, onFilter])

    /** @type {Function} */
    const prevSeason = useCallback(() => {
        setSeason(seasons[season.index + 1])
        onFilter({ delay: 0 })
    }, [season, seasons, onFilter])

    /** @type {Function} */
    const nextSeason = useCallback(() => {
        setSeason(seasons[season.index - 1])
        onFilter({ delay: 0 })
    }, [season, seasons, onFilter])

    /** @type {Function} */
    const onLoad = useCallback((index) => {
        if (mergeContentList(false, index)) {
            api.discover.getBrowseAll(profile, { ...options, start: index })
                .then(res => mergeContentList(res.data, index))
        }
    }, [profile, mergeContentList, options])

    /** @type {Function} */
    const setLocalContent = useCallback(newContent => {
        /** backup all state to restore later */
        viewBackupRef.current = { season, seasons, sort }
        navigateContent(newContent)
    }, [navigateContent, viewBackupRef, season, seasons, sort])

    useEffect(() => {
        if (delay >= 0) {
            changeContentList(null)
            if (season && season.id) {
                api.discover.getBrowseAll(profile, options).then(res => {
                    changeContentList([...res.data, ...new Array(res.total - res.data.length)])
                })
            }
        }
    }, [profile, changeContentList, options, season, delay])

    useEffect(() => {
        if (delay >= 0 && !season) {
            api.discover.getSeasonList(profile).then(({ data: seasonsList }) => {
                seasonsList.forEach((item, index) => { item.index = index })
                setSeasons(seasonsList)
                setSeason(seasonsList[0])
            })
        }
    }, [profile, setSeason, delay, season])

    useEffect(() => {  // initializing
        onFilter({ delay: 0 })
    }, [profile, changeContentList, onFilter])

    return (
        <Row className={css.ContentGrid} {...rest}>
            <Column>
                <Cell shrink>
                    <Row>
                        <Cell shrink>
                            <Dropdown title={$L('Order')}
                                selected={order.findIndex(i => i.key === sort)}
                                width='small'
                                onSelect={onSelectOrder}
                                onKeyDown={dropdownKeydown}
                                showCloseButton>
                                {orderStr}
                            </Dropdown>
                        </Cell>
                        {season && season.index + 1 < seasons.length &&
                            <Cell shrink>
                                <Button onClick={prevSeason}>{$L('Prev Season')}</Button>
                            </Cell>
                        }
                        <Cell shrink>
                            <LabeledItem>
                                {title}
                                {season && season.localization.title && ' - '}
                                {season && season.localization.title}
                            </LabeledItem >
                        </Cell>
                        {season && season.index - 1 >= 0 &&
                            <Cell shrink>
                                <Button onClick={nextSeason}>{$L('Next Season')}</Button>
                            </Cell>
                        }
                    </Row>
                </Cell>
                <Cell grow>
                    <Row className={css.scrollerContainer}>
                        <Cell grow>
                            <ContentGridItems
                                type='simulcast'
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

Simulcast.propTypes = {
    profile: PropTypes.object.isRequired,
    title: PropTypes.string.isRequired,
}

export default Simulcast
