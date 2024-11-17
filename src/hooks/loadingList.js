
import { useRef, useEffect, useCallback } from 'react'
import { Column } from '@enact/ui/Layout'
import Spinner from '@enact/moonstone/Spinner'

import { $L } from '../hooks/language'
import cssShared from '../components/Share.module.less'

/**
 * @param {import('react').ComponentType<Any>} WrappedComponent
 * @param {String} [propName]
 */
const withLoadingList = (WrappedComponent, propName = 'list') => {

    return props => {
        /** @type {Array} */
        const list = props[propName]
        /** @type {{current: HTMLDivElement}} */
        const containerRef = useRef(null)
        /** @type {{current: Number}} */
        const clientHeight = useRef(null)
        /** @type {{current: Function}} */
        const scrollToRef = useRef(null)
        /** @type {{current: Function}} */
        const indexRef = useRef(null)
        /** @type {Function} */
        const setScroll = useCallback(fn => { scrollToRef.current = fn }, [])
        const setIndexRef = useCallback(index => { indexRef.current = index }, [])

        useEffect(() => {
            if (scrollToRef.current && clientHeight.current != null) {
                if (clientHeight.current !== containerRef.current.clientHeight) {
                    scrollToRef.current({ index: indexRef.current || 0, animate: false, focus: true })
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
                    <WrappedComponent {...props} setScroll={setScroll} setIndexRef={setIndexRef} />
                }
            </div>
        )
    }
}

export default withLoadingList
