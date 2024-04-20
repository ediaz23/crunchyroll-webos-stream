
import { useCallback, useState, useEffect, useMemo } from 'react'
import { Cell, Row, Column } from '@enact/ui/Layout'
import Spinner from '@enact/moonstone/Spinner'
import Button from '@enact/moonstone/Button'
import LabeledItem from '@enact/moonstone/LabeledItem'
import Dropdown from '@enact/moonstone/Dropdown'
import PropTypes from 'prop-types'

import { useSetRecoilState } from 'recoil'

import { $L } from '../../hooks/language'
import { homeViewReadyState } from '../../recoilConfig'
import ContentGridItems from '../grid/ContentGridItems'
import api from '../../api'
import css from '../grid/ContentGrid.module.less'


/**
 * @typedef Season
 * @type {Object}
 * @property {String} id
 * @property {Number} index
 * @property {{title: String, description: String}} localization
 */


/**
 * @todo keep search after navegate?
 * @param {Object} obj
 * @param {Object} obj.profile current profile
 * @param {String} obj.title title for view
 */
const Simulcast = ({ profile, title, ...rest }) => {
    /** @type {Function} */
    const setHomeViewReady = useSetRecoilState(homeViewReadyState)
    /** @type {[Array<Object>, Function]} */
    const [contentList, setContentList] = useState([])
    /** @type {[Object, Function]} */
    const [autoScroll, setAutoScroll] = useState(true)
    /** @type {[import('./SeasonButtons').Season, Function]} */
    const [season, setSeason] = useState(undefined)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)
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

    /** @type {Function} */
    const onSelectOrder = useCallback(({ selected }) => { setOrder(order[selected].key) }, [order, setOrder])

    /** @type {Function} */
    const onScroll = useCallback(() => setAutoScroll(false), [])

    /** @type {Function} */
    const prevSeason = useCallback(() => { setSeason(seasons[season.index + 1]) }, [season, seasons])

    /** @type {Function} */
    const nextSeason = useCallback(() => { setSeason(seasons[season.index - 1]) }, [season, seasons])

    useEffect(() => {
        setLoading(true)
        if (season && season.id) {
            api.discover.getBrowseAll(profile, {
                quantity: 500,
                ratings: true,
                noMock: true,
                seasonTag: season.id,
                sort,
            }).then(res => {
                setContentList(res.data)
                setLoading(false)
                setHomeViewReady(true)
            })
        }
    }, [profile, setLoading, setHomeViewReady, season, setContentList, sort])

    useEffect(() => {  // initial request
        api.discover.getSeasonList(profile).then(({ data: seasonsList }) => {
            seasonsList.forEach((item, index) => { item.index = index })
            setSeasons(seasonsList)
            setSeason(seasonsList[0])
            setAutoScroll(true)
        })
        return () => {
            setSeasons([])
            setSeason(undefined)
            setContentList([])
            setAutoScroll(true)
        }
    }, [profile, setSeason, setAutoScroll])

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
                                    autoScroll={autoScroll}
                                    onScroll={onScroll} />
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

export default Simulcast
