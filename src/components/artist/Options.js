
import { useCallback, useRef, useEffect } from 'react'
import ri from '@enact/ui/resolution'
import Item from '@enact/moonstone/Item'
import Icon from '@enact/moonstone/Icon'
import VirtualList from '@enact/moonstone/VirtualList'
import PropTypes from 'prop-types'

import withLoadingList from '../../hooks/loadingList'
import css from './Artist.module.less'
import cssShared from '../Share.module.less'
import scrollCss from '../../patch/Scroller.module.less'


const renderItem = ({ options, index, itemHeight: height, ...rest }) => {
    return (
        <Item key={index} style={{ height }} {...rest}>
            <Icon className={cssShared.IconCustomColor}>
                {options[index].icon}
            </Icon>
            <span>{options[index].title}</span>
        </Item>
    )
}

/**
 * @param {Object} obj
 * @param {Array<Object>} obj.options
 * @param {Function} obj.selectOption
 * @param {Number} [obj.selectIndex]
 * @param {Function} obj.setScroll
 * @param {Function} obj.setIndexRef
 */
const Options = ({ options, selectOption, selectIndex, setScroll, setIndexRef, ...rest }) => {
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {Number} */
    const itemHeight = ri.scale(70)
    /** @type {{current: Number}} */
    const selectIndexRef = useRef(selectIndex)
    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => {
        scrollToRef.current = scrollTo
        setScroll(scrollTo)
    }, [setScroll])
    /** @type {Function} */
    const onFocus = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        selectOption(parseInt(target.dataset.index))
    }, [selectOption])

    useEffect(() => {
        selectIndexRef.current = selectIndex
        setIndexRef(selectIndex)
    }, [selectIndex, setIndexRef])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current) {
                clearInterval(interval)
                scrollToRef.current({ index: selectIndexRef.current || 0, animate: false, focus: true })
            }
        }, 100)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className={`${css.scrollerContainer} ${scrollCss.scrollerFix}`}>
            <VirtualList
                {...rest}
                className={css.optionsContainer}
                dataSize={optionList.length}
                itemRenderer={renderItem}
                itemSize={itemHeight}
                cbScrollTo={getScrollTo}
                direction='vertical'
                verticalScrollbar='hidden'
                childProps={{
                    onFocus,
                    itemHeight,
                    options
                }}
            />
        </div>
    )
}

Options.propTypes = {
    options: PropTypes.array.isRequired,
    selectOption: PropTypes.func.isRequired,
    selectIndex: PropTypes.number
}

export default withLoadingList(Options, 'options')
