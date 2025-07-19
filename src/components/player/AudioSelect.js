
import { useCallback, useState } from 'react'
import IconButton from '@enact/moonstone/IconButton'
import ContextualPopupDecorator from '@enact/moonstone/ContextualPopupDecorator'
import PropTypes from 'prop-types'

import AudioList from './AudioList'
import { useNavigate } from '../../hooks/navigate'

const IconButtonWithPopup = ContextualPopupDecorator(IconButton)

/**
 * @param {Object} obj
 * @param {Array<import('./AudioList').Audio>} obj.audios
 * @param {import('./AudioList').Audio} [obj.audio]
 * @param {Function} obj.selectAudio
 * @param {Function} [obj.triggerActivity]
 */
const AudioSelect = ({ audios, audio, selectAudio, triggerActivity, ...rest }) => {
    const { pushHistory, popHistory } = useNavigate()
    /** @type {[Boolean, Function]} */
    const [showAudioList, setShowAudioList] = useState(false)

    const toggleAudioList = useCallback(() => {
        if (showAudioList) {
            setShowAudioList(false)
            popHistory()
        } else {
            setShowAudioList(true)
            pushHistory(() => setShowAudioList(false))
        }
    }, [showAudioList, setShowAudioList, pushHistory, popHistory])

    const onSelectAudio = useCallback(({ selected }) => {
        selectAudio(selected)
        toggleAudioList()
    }, [toggleAudioList, selectAudio])

    const audioList = useCallback(() => (
        <AudioList
            audios={audios}
            audio={audio}
            onSelectAudio={onSelectAudio}
            triggerActivity={triggerActivity} />
    ), [audios, audio, onSelectAudio, triggerActivity])

    return (
        <IconButtonWithPopup
            backgroundOpacity="lightTranslucent"
            open={showAudioList}
            onClick={toggleAudioList}
            onClose={toggleAudioList}
            popupComponent={audioList}
            direction='up'
            showCloseButton
            {...rest}>
            audio
        </IconButtonWithPopup>
    )
}

AudioSelect.propTypes = {
    audios: PropTypes.arrayOf(PropTypes.object).isRequired,
    audio: PropTypes.object,
    selectAudio: PropTypes.func.isRequired,
    triggerActivity: PropTypes.func,
}

export default AudioSelect
