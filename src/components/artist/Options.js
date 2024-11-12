
import { useCallback, useRef, useEffect } from 'react'
import ri from '@enact/ui/resolution'
import Item from '@enact/moonstone/Item'
import Icon from '@enact/moonstone/Icon'
import VirtualList from '@enact/moonstone/VirtualList'
import PropTypes from 'prop-types'

import css from './Artist.module.less'
import cssShared from '../Share.module.less'
import scrollCss from '../../patch/Scroller.module.less'

/**
 * @param {Object} obj
 * @param {Array<Object>} obj.optionList
 * @param {Function} obj.selectContent
 * @param {Number} [obj.selectIndex]
 */
const Options = ({ optionList, selectContent, selectIndex, ...rest }) => {
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])
    const itemHeight = ri.scale(70)

    /** @type {Function} */
    const renderItem = useCallback(({ index, itemHeight: height, ...restProps }) => {
        return (
            <Item {...restProps}
                onFocus={selectContent}
                key={index}
                style={{ height }}>
                <Icon className={cssShared.IconCustomColor}>
                    {optionList[index].icon}
                </Icon>
                <span>{optionList[index].title}</span>
            </Item>
        )
    }, [optionList, selectContent])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current && optionList.length > 0) {
                clearInterval(interval)
                scrollToRef.current({ index: selectIndex || 0, animate: false, focus: true })
            }
        }, 100)
        return () => clearInterval(interval)
    }, [optionList, selectIndex])

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
                childProps={{ itemHeight }}
            />
        </div>
    )
}

Options.propTypes = {
    optionList: PropTypes.array.isRequired,
    selectContent: PropTypes.func.isRequired,
    selectIndex: PropTypes.number
}

export default Options
