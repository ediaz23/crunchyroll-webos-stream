
import { useCallback, useState } from 'react'
import IconButton from '@enact/moonstone/IconButton'
import ContextualPopupDecorator from '@enact/moonstone/ContextualPopupDecorator'
import PropTypes from 'prop-types'

import SubtitleList from './SubtitleList'

const IconButtonWithPopup = ContextualPopupDecorator(IconButton)


/**
 * @param {Object} obj
 * @param {Array<import('./SubtitleList').Subtitle>} obj.subtitles
 * @param {import('./SubtitleList').Subtitle} obj.subtitle
 * @param {Function} obj.onSelectSubtitle
 */
const SubtitleSelect = ({ subtitles, subtitle, selectSubtitle, ...rest }) => {

    /** @type {[Boolean, Function]} */
    const [showSubtitleList, setShowSubtitleList] = useState(false)

    const onShowSubtitleList = useCallback(() => { setShowSubtitleList(oldVar => !oldVar) }, [setShowSubtitleList])
    const onHideSubtitleList = useCallback(() => { setShowSubtitleList(false) }, [setShowSubtitleList])
    const onSelectSubtitle = useCallback(({ selected }) => {
        selectSubtitle(selected)
        onHideSubtitleList()
    }, [onHideSubtitleList, selectSubtitle])
    const subtitleList = useCallback(() => (
        <SubtitleList subtitles={subtitles} subtitle={subtitle} onSelectSubtitle={onSelectSubtitle} />
    ), [subtitles, subtitle, onSelectSubtitle])

    return (
        <IconButtonWithPopup
            backgroundOpacity="lightTranslucent"
            open={showSubtitleList}
            onClick={onShowSubtitleList}
            onClose={onHideSubtitleList}
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
}

export default SubtitleSelect
