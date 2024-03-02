
import { useState, useEffect, useCallback } from 'react'
import Item from '@enact/moonstone/Item'
import classNames from 'classnames'
import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import Scroller from '../../patch/Scroller'
import api from '../../api'
import css from './ContentGrid.module.less'


/**
 * Show Category list
 * @param {{
    profile: Object,
    category: String,
    setCategory: Function,
    setDelay: Function,
 }}
 */
const CategoryList = ({ profile, category, setCategory, setDelay, ...rest }) => {
    /** @type {[Array<{id: String, localization: Object}>, Function]} */
    const [categories, setCategories] = useState([])

    const selectCategory = useCallback((ev) => {
        if (ev.target && ev.target.id) {
            setCategory(ev.target.id)
            setDelay(1000)
        }
    }, [setCategory, setDelay])

    useEffect(() => {  // search categories
        api.discover.getCategories(profile).then(({ data: categs }) => {
            setCategories([
                { id: 'all', localization: { title: $L('All') } },
                ...categs
            ])
        })
    }, [profile])

    return (
        <div className={css.scrollerContainer} {...rest}>
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
    )
}

CategoryList.propTypes = {
    profile: PropTypes.object.isRequired,
    category: PropTypes.string.isRequired,
    setCategory: PropTypes.func.isRequired,
    setDelay: PropTypes.func.isRequired,
}

export default CategoryList
