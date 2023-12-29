import { useCallback } from 'react'
import { Column } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import CheckboxItem from '@enact/moonstone/CheckboxItem'
import $L from '@enact/i18n/$L'
import PropTypes from 'prop-types'

import { useSetRecoilState } from 'recoil'

import { currentProfileState } from '../../recoilConfig'
import css from './Edit.module.less'
import SelectLanguage from '../SelectLanguage'
import Field from '../Field'
import { useSaveProfile, useSaveOneProfileField } from '../../hooks/profile'


/**
 * @typedef LangList
 * @type {Object}
 * @property {Array<import('../SelectLanguage').LangTuple>} audio
 * @property {Array<import('../SelectLanguage').LangTuple>} content
 * @property {Array<import('../SelectLanguage').LangTuple>} subtitles
 *
 */
/**
 * @typedef ProfileEditProps
 * @type {Object}
 * @property {import('crunchyroll-js-api/src/types').Profile} profile
 * @property {LangList} langList
 * @property {Function} saveProfile
 */
/**
 * @param {ProfileEditProps} obj
 */
const ProfileEdit = ({ profile, langList, ...rest }) => {
    /** @type {Function} */
    const setProfile = useSetRecoilState(currentProfileState)
    const saveProfile = useSaveProfile({ profile, setProfile })
    const saveLang = useSaveOneProfileField({ profile, setProfile, field: 'preferred_communication_language' })
    const saveAudio = useSaveOneProfileField({ profile, setProfile, field: 'preferred_content_audio_language' })
    const saveSubs = useSaveOneProfileField({ profile, setProfile, field: 'preferred_content_subtitle_language' })


    const onToggleAdult = useCallback(async ({ selected }) => {
        await saveProfile({ 'maturity_rating': selected ? 'M3' : 'M2' })
    }, [saveProfile])

    return (
        <Column className={css.editForm} {...rest}>
            <Heading size="large">{$L('Preferences')}</Heading>
            <Heading size="small">{$L('Set your language, video preferences')}</Heading>
            <Field title={$L('Content Language')}>
                <SelectLanguage
                    languages={langList.content}
                    save={saveLang}
                    value={profile.preferred_communication_language} />
            </Field>
            <Field title={$L('Audio Language')}>
                <SelectLanguage
                    languages={langList.audio}
                    save={saveAudio}
                    value={profile.preferred_content_audio_language} />
            </Field>
            <Field title={$L('Subtitles Language')}>
                <SelectLanguage
                    languages={langList.subtitles}
                    save={saveSubs}
                    value={profile.preferred_content_subtitle_language} />
            </Field>
            <Field >
                <CheckboxItem defaultSelected={profile.maturity_rating === 'M3'}
                    onToggle={onToggleAdult}>
                    {$L('Adult content')}
                </CheckboxItem>
            </Field>
        </Column >
    )
}

ProfileEdit.propTypes = {
    profile: PropTypes.object.isRequired,
    langList: PropTypes.shape({
        audio: PropTypes.arrayOf(PropTypes.shape({
            key: PropTypes.string.isRequired,
            children: PropTypes.string.isRequired,
        })).isRequired,
        content: PropTypes.arrayOf(PropTypes.shape({
            key: PropTypes.string.isRequired,
            children: PropTypes.string.isRequired,
        })).isRequired,
        subtitles: PropTypes.arrayOf(PropTypes.shape({
            key: PropTypes.string.isRequired,
            children: PropTypes.string.isRequired,
        })).isRequired,
    }).isRequired,
}

export default ProfileEdit
