
import { useCallback, useState } from 'react'
import IconButton from '@enact/moonstone/IconButton'
import ContextualPopupDecorator from '@enact/moonstone/ContextualPopupDecorator'
import PropTypes from 'prop-types'

import SubtitleList from './SubtitleList'
import { useNavigate } from '../../hooks/navigate'

const IconButtonWithPopup = ContextualPopupDecorator(IconButton)


/**
 * @param {Object} obj
 * @param {Array<import('./SubtitleList').Subtitle>} obj.subtitles
 * @param {import('./SubtitleList').Subtitle} [obj.subtitle]
 * @param {Function} obj.onSelectSubtitle
 * @param {Function} [obj.triggerActivity]
 */
const SubtitleSelect = ({ subtitles, subtitle, selectSubtitle, triggerActivity, ...rest }) => {
    const { pushHistory, popHistory } = useNavigate()
    /** @type {[Boolean, Function]} */
    const [showSubtitleList, setShowSubtitleList] = useState(false)

    const toggleSubtitleList = useCallback(() => {
        if (showSubtitleList) {
            setShowSubtitleList(false)
            popHistory()
        } else {
            setShowSubtitleList(true)
            pushHistory(() => setShowSubtitleList(false))
        }
    }, [showSubtitleList, setShowSubtitleList, pushHistory, popHistory])

    const onSelectSubtitle = useCallback(({ selected }) => {
        selectSubtitle(selected)
        toggleSubtitleList()
    }, [selectSubtitle, toggleSubtitleList])

    const subtitleList = useCallback(() => (
        <SubtitleList
            subtitles={subtitles}
            subtitle={subtitle}
            onSelectSubtitle={onSelectSubtitle}
            triggerActivity={triggerActivity} />
    ), [subtitles, subtitle, onSelectSubtitle, triggerActivity])

    return (
        <IconButtonWithPopup
            backgroundOpacity="lightTranslucent"
            open={showSubtitleList}
            onClick={toggleSubtitleList}
            onClose={toggleSubtitleList}
            popupComponent={subtitleList}
            direction='up'
            showCloseButton
            {...rest}>
            sub
        </IconButtonWithPopup>
    )
}

SubtitleSelect.propTypes = {
    subtitles: PropTypes.arrayOf(PropTypes.object).isRequired,
    subtitle: PropTypes.object,
    selectSubtitle: PropTypes.func.isRequired,
    triggerActivity: PropTypes.func,
}

export default SubtitleSelect
