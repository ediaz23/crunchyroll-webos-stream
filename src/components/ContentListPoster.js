
import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { Cell, Column } from '@enact/ui/Layout'

import PropTypes from 'prop-types'

import HomeContentBanner from './home/ContentBanner'
import ContentGridItems from './grid/ContentGridItems'
import useContentList from '../hooks/contentList'


/**
 * ContentListPoster
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile current profile
 * @param {String} obj.type
 * @param {Function} obj.loadData
 * @param {Function} [obj.onSelect]
 * @param {'tall'|'wide'} [obj.mode]
 * @param {Boolean} [obj.noPoster]
 * @param {Boolean} [obj.noCache]
 * @param {Object} [obj.homeBackupOverride]
 * @param {Object} [obj.homePositionOverride]
 */
const ContentListPoster = ({ profile, type, loadData, onSelect, mode = 'wide', noPoster = false,
    homeBackupOverride, homePositionOverride, ...rest }) => {

    const { contentList, quantity, autoScroll, delay,
        mergeContentList, changeContentList, onLeave, onFilter,
    } = useContentList(type, homeBackupOverride, homePositionOverride)

    /** @type {[Object, Function]} */
    const [selectedContent, setSelectedContent] = useState(null)

    /** @type {import('./grid/ContentGrid').SearchOptions} */
    const options = useMemo(() => { return { quantity } }, [quantity])

    /** @type {Function} */
    const onSelectItem = useCallback((ev) => {
        if (ev.currentTarget) {
            const content = contentList[parseInt(ev.currentTarget.dataset['index'])]
            setSelectedContent(content)
        }
    }, [contentList, setSelectedContent])

    /** @type {Function} */
    const onLoad = useCallback((index) => {
        if (mergeContentList(false, index)) {
            loadData({ ...options, start: index }).then(res => mergeContentList(res.data, index))
        }
    }, [loadData, mergeContentList, options])

    /** @type {{current: Boolean}} */
    const autoScrollRef = useRef(true)

    /** @type {Function} */
    const onLeaveView = useCallback(() => {
        onLeave(null)
    }, [onLeave])

    useEffect(() => {
        if (delay >= 0) {
            changeContentList(null)
            loadData(options).then(res => {
                changeContentList([...res.data, ...new Array(res.total - res.data.length)], autoScrollRef.current)
                autoScrollRef.current = true
            })
        }
    }, [profile, loadData, changeContentList, options, delay])

    useEffect(() => {  // initializing
        onFilter({ delay: 0, scroll: true })
        autoScrollRef.current = false
    }, [profile, changeContentList, onFilter])

    return (
        <Column {...rest}>
            <Column>
                <Cell size="50%">
                    {selectedContent &&
                        <HomeContentBanner
                            content={selectedContent}
                            noPoster={noPoster} />
                    }
                </Cell>
                <Cell grow>
                    <ContentGridItems
                        contentList={contentList}
                        load={onLoad}
                        onLeave={onLeaveView}
                        onSelect={onSelect}
                        onFocus={onSelectItem}
                        autoScroll={autoScroll}
                        mode={mode}
                        homePositionOverride={homePositionOverride} />
                </Cell>
            </Column>
        </Column>
    )
}

ContentListPoster.propTypes = {
    profile: PropTypes.object.isRequired,
    type: PropTypes.string.isRequired,
    loadData: PropTypes.func.isRequired,
    onSelect: PropTypes.func,
    mode: PropTypes.oneOf(['tall', 'wide']),
    noPoster: PropTypes.bool,
    homeBackupOverride: PropTypes.any,
    homePositionOverride: PropTypes.any,
}

export default ContentListPoster
