
import { useCallback } from 'react'
import Item from '@enact/moonstone/Item'
import classNames from 'classnames'
import PropTypes from 'prop-types'

import { useRecoilValue } from 'recoil'

import { categoriesState } from '../../recoilConfig'

import Scroller from '../../patch/Scroller'
import css from './ContentGrid.module.less'


/**
 * Show Category list
 * @param {Object} obj
 * @param {String} obj.category
 * @param {Function} obj.setCategory
 * @param {Function} obj.setDelay
 */
const CategoryList = ({ category, setCategory, setDelay, ...rest }) => {
    /** @type {Array<{id: String, title: String}>} */
    const categories = useRecoilValue(categoriesState)

    const selectCategory = useCallback((ev) => {
        if (ev.target && ev.target.id) {
            setCategory(ev.target.id)
            setDelay({ delay: 100, scroll: true })
        }
    }, [setCategory, setDelay])

    return (
        <div className={css.scrollerContainer} {...rest}>
            <Scroller direction='vertical' horizontalScrollbar='hidden'
                verticalScrollbar='visible'>
                {categories.map(categ => {
                    return (
                        <Item id={categ.id} key={categ.id}
                            onClick={selectCategory}
                            css={{ item: classNames('', { [css.iconActive]: category === categ.id }) }}>
                            <span>{categ.title}</span>
                        </Item>
                    )
                })}
            </Scroller>
        </div>
    )
}

CategoryList.propTypes = {
    category: PropTypes.string.isRequired,
    setCategory: PropTypes.func.isRequired,
    setDelay: PropTypes.func.isRequired,
}

export default CategoryList
