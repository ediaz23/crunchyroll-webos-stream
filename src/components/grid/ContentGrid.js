
import { useCallback, useState, useEffect, useMemo } from 'react'
import { Cell, Row, Column } from '@enact/ui/Layout'
import Spinner from '@enact/moonstone/Spinner'
import Heading from '@enact/moonstone/Heading'
import Item from '@enact/moonstone/Item'
import Button from '@enact/moonstone/Button'
import Input from '@enact/moonstone/Input'
import { VirtualGridList } from '@enact/moonstone/VirtualList'
import GridListImageItem from '@enact/moonstone/GridListImageItem'
import ri from '@enact/ui/resolution'
import classNames from 'classnames'

import PropTypes from 'prop-types'
import $L from '@enact/i18n/$L'

import Scroller from '../../patch/Scroller'
import { TOOLBAR_INDEX } from '../home/Toolbar'
import api from '../../api'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import css from './ContentGrid.module.less'


/**
 * @typedef Season
 * @type {Object}
 * @property {String} id
 * @property {Number} index
 * @property {{title: String, description: String}} localization
 */

/**
 * Show header for content, with title
 * @param {{
    season: Season,
    seasons: Array<Season>,
    setSeason: Function,
    setDelay: Function,
 }}
 */
const SeasonButtons = ({ season, seasons, setSeason, setDelay }) => {

    const prevSeason = useCallback(() => {
        setSeason(seasons[season.index + 1])
        setDelay(0)
    }, [season, seasons, setSeason, setDelay])

    const nextSeason = useCallback(() => {
        setSeason(seasons[season.index - 1])
        setDelay(0)
    }, [season, seasons, setSeason, setDelay])

    return (
        <Cell shrink>
            <Row align='start space-between'>
                {season.index + 1 < seasons.length &&
                    <Button onClick={prevSeason}>{$L('Prev Season')}</Button>
                }
                {season.index - 1 >= 0 &&
                    <Button onClick={nextSeason}>{$L('Next Season')}</Button>
                }
            </Row>
        </Cell>
    )
}


const ContentGrid = ({ profile, contentKey, contentType, ...rest }) => {
    /** @type {[Array<String>, Function]} */
    const [categories, setCategories] = useState([])
    /** @type {[Array<Object>, Function]} */
    const [contentList, setContentList] = useState([])
    /** @type {[String, Function]} */
    const [category, setCategory] = useState('all')
    /** @type {[String, Function]} */
    const [query, setQuery] = useState('')
    /** @type {[Season, Function]} */
    const [season, setSeason] = useState(undefined)
    /** @type {[Array<Season>, Function]} */
    const [seasons, setSeasons] = useState(undefined)
    /** @type {[Number, Function]} */
    const [delay, setDelay] = useState(-1)
    /** @type {[String, Function]} */
    const [sort, setSort] = useState('popularity')
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
            category: category !== 'all' ? [category] : [],
            seasonTag: season ? season.id : undefined,
            type: contentType,
            sort,
            query,
            contentKey,
        }
    }, [category, season, contentType, sort, query, contentKey])
    const itemHeight = ri.scale(390)
    const getImagePerResolution = useGetImagePerResolution()

    const selectCategory = useCallback((ev) => {
        if (ev.target && ev.target.id) {
            setCategory(ev.target.id)
            setDelay(500)
        }
    }, [setCategory, setDelay])

    const onSearch = useCallback(({ value }) => {
        setQuery(value)
        setDelay(500)
        setSort(value === '' ? 'popularity' : 'alphabetical')
    }, [setQuery, setDelay])

    /**
     * @todo falta seleccionar el contenido
     */
    const renderItem = useCallback(({ index, ...rest2 }) => {
        let out
        const contentItem = contentList[index]
        if (contentItem) {
            //
            //                    onClick={selectImageItem}
            //                    selected={selected}
            //                    selectionOverlayShowing={selectionOverlayShowing}
            const image = getImagePerResolution({
                height: itemHeight,
                content: contentItem,
                mode: 'tall'
            })
            out = (
                <GridListImageItem
                    {...rest2}
                    source={image.source}
                    caption={(contentItem.title || '').replace(/\n/g, "")}
                    subCaption={(contentItem.description || '').replace(/\n/g, "")}
                />
            )
        } else {
            if (index % options.quantity === 0) {
                api.discover.getBrowseAll(profile, { ...options, start: index })
                    .then(res => setContentList(prevArray => [
                        ...prevArray.slice(0, index),
                        ...res.data,
                    ]))
            }
            const { itemSize } = rest2
            delete rest2.itemSize
            delete rest2.cellId
            out = (
                <div {...rest2} style={{ height: itemSize }}>
                    <Spinner />
                </div>
            )
        }
        return out
    }, [profile, contentList, options, itemHeight, getImagePerResolution])

    useEffect(() => {
        let delayDebounceFn = undefined
        if (delay >= 0) {
            delayDebounceFn = setTimeout(() => {
                api.discover.getBrowseAll(profile, options).then(res => {
                    if (res.total - options.quantity > 0) {
                        setContentList([...res.data, ...new Array(res.total - options.quantity)])
                    } else {
                        setContentList(res.data)
                    }
                })
            }, delay)
        }
        return () => clearTimeout(delayDebounceFn)
    }, [profile, action, contentKey, delay, options])

    useEffect(() => {  // search categories
        api.discover.getCategories(profile).then(({ data: categs }) => {
            setCategories([
                { id: 'all', localization: { title: $L('All') } },
                ...categs
            ])
        })
    }, [profile, contentKey])

    useEffect(() => {  // initial request
        if (contentKey === 'simulcast') {
            api.discover.getSeasonList(profile).then(({ data: seasonsList }) => {
                seasonsList.forEach((item, index) => { item.index = index })
                setSeasons(seasonsList)
                setSeason(seasonsList[0])
                setDelay(0)
            })
        } else {
            setDelay(0)
        }
        return () => {
            setDelay(-1)
            setSeasons([])
            setSeason(undefined)
            setQuery('')
            setCategory('all')
            setContentList([])
            setSort('popularity')
        }
    }, [profile, contentKey, setSeasons, setSeason, setDelay, setQuery, setCategory, setContentList, setSort])

    return (
        <Row className={css.ContentGrid} {...rest}>
            <Cell size="20%">
                <Heading>
                    {action.label}
                </Heading>
                <div className={css.scrollerContainer}>
                    <Scroller direction='vertical' horizontalScrollbar='hidden'
                        verticalScrollbar='visible'>
                        {categories.map(categ => {
                            return (
                                <Item id={categ.id} key={categ.id}
                                    onFocus={selectCategory}
                                    css={{ item: classNames('', { [css.iconActive]: category === categ.id }) }}>
                                    <span>{categ.localization.title}</span>
                                </Item>
                            )
                        })}
                    </Scroller>
                </div>
            </Cell>
            <Cell grow>
                <Column className={css.grid}>
                    <Cell shrink>
                        <Input placeholder={$L('Search')}
                            value={query}
                            onChange={onSearch}
                            iconAfter="search" />
                    </Cell>
                    <Cell grow>
                        <VirtualGridList
                            dataSize={contentList.length}
                            itemRenderer={renderItem}
                            itemSize={{ minHeight: itemHeight, minWidth: ri.scale(240) }}
                            spacing={ri.scale(25)}
                        />
                    </Cell>
                    {contentKey === 'simulcast' && season &&
                        <SeasonButtons
                            season={season}
                            seasons={seasons}
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
}

export default ContentGrid
