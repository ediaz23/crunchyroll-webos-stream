
import { useCallback, useState } from 'react'
import IconButton from '@enact/moonstone/IconButton'
import ContextualPopupDecorator from '@enact/moonstone/ContextualPopupDecorator'
import PropTypes from 'prop-types'

import AudioList from './AudioList'

const IconButtonWithPopup = ContextualPopupDecorator(IconButton)

/**
 * @param {{
    audios: Array<import('./AudioList').Audio>,
    audio: Audio,
    selectAudio: Function
 }}
 */
const AudioSelect = ({ audios, audio, selectAudio, ...rest }) => {

    /** @type {[Boolean, Function]} */
    const [showAudioList, setShowAudioList] = useState(false)

    const onShowAudioList = useCallback(() => { setShowAudioList(oldVar => !oldVar) }, [setShowAudioList])
    const onHideAudioList = useCallback(() => { setShowAudioList(false) }, [setShowAudioList])
    const onSelectAudio = useCallback(({ selected }) => {
        selectAudio(selected)
        onHideAudioList()
    }, [onHideAudioList, selectAudio])
    const audioList = useCallback(() => (
        <AudioList audios={audios} audio={audio} onSelectAudio={onSelectAudio} />
    ), [audios, audio, onSelectAudio])

    return (
        <IconButtonWithPopup
            backgroundOpacity="lightTranslucent"
            open={showAudioList}
            onClick={onShowAudioList}
            onClose={onHideAudioList}
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
}

export default AudioSelect
