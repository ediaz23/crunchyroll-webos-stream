
import { useRef, useEffect } from 'react'
import { Column } from '@enact/ui/Layout'
import Spinner from '@enact/moonstone/Spinner'

import PropTypes from 'prop-types'

import { $L } from '../hooks/language'
import cssShared from './Share.module.less'

/**
 * @param {Object} obj
 * @param {Array} [obj.list]
 * @param {Number} [obj.index]
 * @param {Fucntion} [obj.scrollFn]
 * @param {React.ReactNode} [obj.children]
 */
const LoadingList = ({ list, index, scrollFn, children }) => {
    /** @type {{current: HTMLDivElement}} */
    const containerRef = useRef(null)
    /** @type {{current: Number}} */
    const clientHeight = useRef(null)

    useEffect(() => {
        if (scrollFn && clientHeight.current != null) {
            if (clientHeight.current !== containerRef.current.clientHeight) {
                scrollFn({ index: Math.min(index, list.length - 1), animate: false, focus: false })
            }
        }
        clientHeight.current = containerRef.current.clientHeight
    })

    return (
        <div className={cssShared.virtualListContainer} ref={containerRef}>
            {!list &&
                <Column align='center center' style={{ height: '100%', width: '100%' }}>
                    <Spinner />
                </Column>
            }
            {list && list.length === 0 &&
                <Column align='center center' style={{ height: '100%', width: '100%' }}>
                    <h1>{$L('Empty')}</h1>
                </Column>
            }
            {list && list.length > 0 &&
                children
            }
        </div>
    )
}

LoadingList.propTypes = {
    list: PropTypes.array,
    index: PropTypes.number,
    scrollFn: PropTypes.func,
    children: PropTypes.node
}

export default LoadingList
