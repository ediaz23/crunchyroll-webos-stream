
import { useCallback, useState, useEffect, useMemo } from 'react'
import { Cell, Row, Column } from '@enact/ui/Layout'
import Spinner from '@enact/moonstone/Spinner'
import Button from '@enact/moonstone/Button'
import LabeledItem from '@enact/moonstone/LabeledItem'
import Dropdown from '@enact/moonstone/Dropdown'
import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import ContentGridItems from '../grid/ContentGridItems'
import api from '../../api'
import css from '../grid/ContentGrid.module.less'
import withContentList from '../../hooks/contentList'


/**
 * @typedef Season
 * @type {Object}
 * @property {String} id
 * @property {Number} index
 * @property {{title: String, description: String}} localization
 */


/**
 * @todo keep search after navegate?
 * All content grid and search
 * @param {Object} obj
 * @param {Object} obj.profile current profile
 * @param {String} obj.title title for view
 * @param {Array<Object>} obj.contentList List of content to show
 * @param {Boolean} obj.loading loading state
 * @param {Function} obj.setLoading setState function for loading
 * @param {Function} obj.changeContentList set content list array
 * @param {Function} obj.mergeContentList merge content list array
 * @param {Function} obj.quantity quantity to search
 */
const Simulcast = ({
    profile, title,
    contentList, loading, setLoading, changeContentList, mergeContentList, quantity,
    ...rest }) => {
    /** @type {[import('./SeasonButtons').Season, Function]} */
    const [season, setSeason] = useState(undefined)
    /** @type {[Array<Season>, Function]} */
    const [seasons, setSeasons] = useState(undefined)
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
    /** @type {[String, Function]}  */
    const [sort, setOrder] = useState('newly_added')
    /** @type {Object} */
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
    }, [order, setOrder])

    /** @type {Function} */
    const prevSeason = useCallback(() => {
        setSeason(seasons[season.index + 1])
    }, [season, seasons])

    /** @type {Function} */
    const nextSeason = useCallback(() => {
        setSeason(seasons[season.index - 1])
    }, [season, seasons])

    const onLoad = useCallback((index) => {
        if (contentList[index] === undefined) {
            mergeContentList(false, index)
            api.discover.getBrowseAll(profile, { ...options, start: index }).then(res =>
                mergeContentList(res.data, index)
            )

        }
    }, [profile, contentList, mergeContentList, options])

    useEffect(() => {
        setLoading(true)
        if (season && season.id) {
            api.discover.getBrowseAll(profile, options).then(res => {
                changeContentList([...res.data, ...new Array(res.total - res.data.length)])
            })
        }
    }, [profile, changeContentList, options, setLoading, season])

    useEffect(() => {  // initial request
        api.discover.getSeasonList(profile).then(({ data: seasonsList }) => {
            seasonsList.forEach((item, index) => { item.index = index })
            setSeasons(seasonsList)
            setSeason(seasonsList[0])
        })
        return () => {
            setSeasons([])
            setSeason(undefined)
        }
    }, [profile, setSeason])

    return (
        <Row className={css.ContentGrid} {...rest}>
            <Column>
                <Cell shrink>
                    <Row>
                        <Cell shrink>
                            <Dropdown title={$L('Order')}
                                selected={order.findIndex(i => i.key === sort)}
                                width='small'
                                onSelect={onSelectOrder}>
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

Simulcast.propTypes = {
    profile: PropTypes.object.isRequired,
    title: PropTypes.string.isRequired,
}

export default withContentList(Simulcast)
