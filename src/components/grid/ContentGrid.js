
import { useCallback, useState, useEffect, useMemo } from 'react'
import { Cell, Row, Column } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import Input from '@enact/moonstone/Input'

import PropTypes from 'prop-types'
import $L from '@enact/i18n/$L'

import SeasonButtons from './SeasonButtons'
import CategoryList from './CategoryList'
import ContentGridItems from './ContentGridItems'
import { TOOLBAR_INDEX } from '../home/Toolbar'
import api from '../../api'
import css from './ContentGrid.module.less'


const ContentGrid = ({ profile, contentKey, contentType, ...rest }) => {
    /** @type {[Array<Object>, Function]} */
    const [contentList, setContentList] = useState([])
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
        setDelay(500)
    }, [setQuery, setDelay])

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
        }
    }, [profile, contentKey, setSeason, setDelay, setQuery, setCategory, setContentList])

    return (
        <Row className={css.ContentGrid} {...rest}>
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
                            profile={profile}
                            contentList={contentList}
                            setContentList={setContentList}
                            options={options} />
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
}

export default ContentGrid
