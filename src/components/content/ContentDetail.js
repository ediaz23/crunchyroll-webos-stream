
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'
import Image from '@enact/moonstone/Image'

import PropTypes from 'prop-types'
import { useRecoilValue } from 'recoil'

import Options from './Options'
import Seasons from './Seasons'
import Movies from './Movies'
import LangSelector from './LangSelector'

import { isPremiumState } from '../../recoilConfig'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import { useNavigateContent } from '../../hooks/navigate'
import { isPlayable } from '../../utils'
import css from './ContentDetail.module.less'


/**
 * This hook is to allow go back when you are deep component
 * example: watching more episodes
 * @param {Function} pushHistory
 * @param {Function} setIndex
 * @param {Number} index
 * @param {Number} backIndex
 * @return {Function}
 */
const createChangeActivity = (pushHistory, setIndex, index, backIndex) => {
    return () => {
        if (backIndex != null) {
            pushHistory(() => {
                setIndex(backIndex)
            })
        }
        setIndex(index)
    }
}

const ActivityViews = ({ index, children }) => children[index]


/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.content
 */
const ContentDetail = ({ profile, content, ...rest }) => {
    const {
        navigateContent, viewBackup, viewBackupRef,
        pushHistory, popHistory
    } = useNavigateContent(`contentDetail-${content.id}`)
    /** @type {Boolean} */
    const isPremium = useRecoilValue(isPremiumState)
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {[{source: String, size: {width: Number, height: Number}}, Function]} */
    const [image, setImage] = useState(getImagePerResolution({}))
    /** @type {[Number, Function]} */
    const [currentIndex, setCurrentIndex] = useState(viewBackup?.currentIndex || 0)
    const options = useMemo(() => ({
        option: 0,
        moreEpisodes: 1,
        changeAudio: 2,
    }), [])
    const setActivity = useMemo(() => ({
        [options.option]: createChangeActivity(pushHistory, setCurrentIndex, options.option),
        [options.moreEpisodes]: createChangeActivity(pushHistory, setCurrentIndex, options.moreEpisodes, options.option),
        [options.changeAudio]: createChangeActivity(pushHistory, setCurrentIndex, options.changeAudio, options.option),
    }), [options, setCurrentIndex, pushHistory])
    const setActivityRef = useRef(setActivity)
    /** @type {Function} */
    const setContent = useCallback((newContent) => {
        if (currentIndex !== options.option) {
            // if your are setting content and not in "option" activity
            // then useChangeActivity add a history so it has to be removed
            popHistory()
        }
        /** backup all state to restore later */
        viewBackupRef.current = { currentIndex, }
        navigateContent(newContent, { restoreCurrentContent: !isPlayable(newContent.type) })
    }, [currentIndex, navigateContent, options, viewBackupRef, popHistory])

    /** @type {Function} */
    const calculateImage = useCallback((ref) => {
        if (ref) {
            const boundingRect = ref.getBoundingClientRect()
            setImage(getImagePerResolution({ width: boundingRect.width, content }))
        }
    }, [content, getImagePerResolution])

    useEffect(() => { // to back state after back from playing
        if (viewBackup?.currentIndex != null) {
            // if you are back from other view and need to restore previews state
            // has tu excecute useChangeActivity
            setActivityRef.current[viewBackup?.currentIndex]()
        }
    }, [viewBackup?.currentIndex])

    return (
        <Row className={css.ContentDetail} {...rest}>
            <Column className={css.col} ref={calculateImage}>
                {image.source &&
                    <Image className={css.poster} src={image.source} sizing='fill' />
                }
                <Cell className={css.modal}>
                    <ActivityViews index={currentIndex}>
                        <Options
                            profile={profile}
                            contentState={{
                                content,
                                setContent,
                            }}
                            setFunctions={{
                                moreEpisodes: setActivity[options.moreEpisodes],
                                changeAudio: setActivity[options.changeAudio],
                            }} />

                        {content.type === 'series' ?
                            <Seasons
                                profile={profile}
                                contentState={{
                                    content,
                                    setContent,
                                }}
                                isPremium={isPremium} />
                            :
                            <Movies
                                profile={profile}
                                contentState={{
                                    content,
                                    setContent,
                                }}
                                isPremium={isPremium} />
                        }
                        <LangSelector
                            profile={profile}
                            content={content} />
                    </ActivityViews>
                </Cell>
            </Column>
        </Row>
    )
}

ContentDetail.propTypes = {
    profile: PropTypes.object.isRequired,
    content: PropTypes.object.isRequired,
}

export default ContentDetail
