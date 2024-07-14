
import { useMemo } from 'react'
import RadioItem from '@enact/moonstone/RadioItem'
import Group from '@enact/ui/Group'
import ri from '@enact/ui/resolution'
import PropTypes from 'prop-types'

import Scroller from '../../patch/Scroller'


/**
 * @typedef Audio
 * @type {Object}
 * @property {String} audio_locale
 * @property {String} media_guid
 * @property {String} guid
 * @property {String} title
 * @property {"episode"|"musicConcert"} type
 */

/**
 * @param {Object} obj
 * @param {Array<Audio>} obj.audios
 * @param {Audio} obj.audio
 * @param {Function} obj.selectAudio
 */
const AudioList = ({ audios, audio, onSelectAudio, ...rest }) => {

    const audioList = useMemo(() => audios.map(a => {
        return { key: a.audio_locale, children: a.title }
    }), [audios])
    const selectedAudio = audioList.findIndex(val => audio && val.key === audio.audio_locale)

    return (
        <Scroller direction='vertical'
            horizontalScrollbar='hidden'
            verticalScrollbar='visible'
            focusableScrollbar>
            <div style={{ maxHeight: ri.scale(400) }}>
                <Group
                    childComponent={RadioItem}
                    defaultSelected={selectedAudio}
                    onSelect={onSelectAudio}
                    select="radio"
                    selectedProp="selected"
                    {...rest}>
                    {audioList}
                </Group>
            </div>
        </Scroller>
    )
}

AudioList.propTypes = {
    audios: PropTypes.arrayOf(PropTypes.object).isRequired,
    audio: PropTypes.object,
    onSelectAudio: PropTypes.func.isRequired,
}

export default AudioList
