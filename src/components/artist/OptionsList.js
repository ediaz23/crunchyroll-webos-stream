
import { useCallback, useRef, useEffect } from 'react'
import ri from '@enact/ui/resolution'
import Item from '@enact/moonstone/Item'
import Icon from '@enact/moonstone/Icon'
import VirtualList from '@enact/moonstone/VirtualList'
import PropTypes from 'prop-types'

import { useDelayedCall } from '../../hooks/delayedCall'
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
 * @param {Array<Object>} [obj.options]
 * @param {Number} [optionIndex]
 * @param {Function} obj.selectOption
 */
const OptionsList = ({ options, optionIndex, selectOption, ...rest }) => {
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {Number} */
    const itemHeight = ri.scale(70)
    /** @type {{current: Number}} */
    const selectIndexRef = useRef(optionIndex)

    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])

    /** @type {Function} */
    const onFocusCallback = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const index = parseInt(target.dataset.index)
        if (selectIndexRef.current !== index) {
            selectOption(index)
        }
    }, [selectOption])

    /** @type {Function} */
    const onFocus = useDelayedCall(onFocusCallback, 100)

    useEffect(() => {
        selectIndexRef.current = optionIndex
    }, [optionIndex])

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

OptionsList.propTypes = {
    options: PropTypes.array,
    optionIndex: PropTypes.number,
    selectOption: PropTypes.func.isRequired,
}

export default OptionsList
