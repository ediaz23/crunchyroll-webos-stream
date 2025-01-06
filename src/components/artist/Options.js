
import { useCallback, useRef, useEffect } from 'react'
import ri from '@enact/ui/resolution'
import Item from '@enact/moonstone/Item'
import Icon from '@enact/moonstone/Icon'
import VirtualList from '@enact/moonstone/VirtualList'
import PropTypes from 'prop-types'

import LoadingList from '../LoadingList'
import css from './Artist.module.less'
import cssShared from '../Share.module.less'


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
 * @param {Number} [optionIndex]
 */
const Options = ({ options, selectOption, optionIndex, ...rest }) => {
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {Number} */
    const itemHeight = ri.scale(70)
    /** @type {{current: Number}} */
    const selectIndexRef = useRef(optionIndex)

    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])

    /** @type {Function} */
    const onFocus = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const newIndex = parseInt(target.dataset.index)
        if (selectIndexRef.current !== newIndex) {
            selectOption(newIndex)
        }
    }, [selectOption])

    useEffect(() => { selectIndexRef.current = optionIndex }, [optionIndex])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current && selectIndexRef.current != null) {
                clearInterval(interval)
                scrollToRef.current({ index: selectIndexRef.current, animate: false, focus: true })
            }
        }, 100)
        return () => {
            clearInterval(interval)
        }
    }, [])

    return (
        <LoadingList
            list={options}
            index={optionIndex}
            scrollFn={scrollToRef.current}>
            {options && options.length > 0 &&
                <VirtualList
                    {...rest}
                    className={css.optionsContainer}
                    dataSize={options.length}
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
            }
        </LoadingList>
    )
}

Options.propTypes = {
    options: PropTypes.array,
    selectOption: PropTypes.func.isRequired,
    optionIndex: PropTypes.number,
}

export default Options
