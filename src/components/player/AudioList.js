
import { useMemo } from 'react'
import RadioItem from '@enact/moonstone/RadioItem'
import Group from '@enact/ui/Group'
import PropTypes from 'prop-types'


/**
 * @typedef Audio
 * @type {Object}
 * @property {String} audio_locale
 * @property {String} media_guid
 * @property {String} title
 * @property {"episode"|"musicConcert"} type
 */

/**
 * @param {{
    audios: Array<Audio>,
    audio: Audio,
    onSelectAudio: Function
 }}
 */
const AudioList = ({ audios, audio, onSelectAudio, ...rest }) => {

    const audioList = useMemo(() => audios.map(a => {
        return { key: a.audio_locale, children: a.title }
    }), [audios])
    const selectedAudio = audioList.findIndex(val => audio && val.key === audio.audio_locale)

    return (
        <Group
            childComponent={RadioItem}
            defaultSelected={selectedAudio}
            onSelect={onSelectAudio}
            select="radio"
            selectedProp="selected"
            {...rest}>
            {audioList}
        </Group>
    )
}

AudioList.propTypes = {
    audios: PropTypes.arrayOf(PropTypes.object).isRequired,
    audio: PropTypes.object,
    onSelectAudio: PropTypes.func.isRequired,
}

export default AudioList
