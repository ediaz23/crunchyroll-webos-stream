import { useCallback } from 'react'
import { Row, Column } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import CheckboxItem from '@enact/moonstone/CheckboxItem'
import $L from '@enact/i18n/$L'
import PropTypes from 'prop-types'

import css from './ProfileEdit.module.less'
import SelectLanguage from './SelectLanguage'


const Field = ({ title, children }) => {
    return (
        <Row>
            <Column>
                {title &&
                    <Heading size='small' spacing='small'>{title}:</Heading>
                }
                <div>{children}</div>
            </Column>
        </Row>
    )
}

/**
 * @typedef LangTuple
 * @type {Object}
 * @property {String} label
 * @property {String} value
 */

/**
 * @typedef LangList
 * @type {Object}
 * @property {Array<LangTuple>} audio
 * @property {Array<LangTuple>} content
 * @property {Array<LangTuple>} subtitles
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
const ProfileEdit = ({ profile, langList, saveProfile, ...rest }) => {

    const save = useCallback(async (name, tuple) => {
        await saveProfile(name, tuple.value)
    }, [saveProfile])

    const onToggleAdult = useCallback(async ({ selected }) => {
        await saveProfile('maturity_rating', selected ? 'M3' : 'M2')
    }, [saveProfile])

    return (
        <Column className={css.editForm} {...rest}>
            <Heading size="large">{$L('Preferences')}</Heading>
            <Heading size="small">{$L('Set your language, video preferences.')}</Heading>
            <Field title={$L('Content Language')}>
                <SelectLanguage
                    profile={profile}
                    languages={langList.content}
                    name="preferred_communication_language"
                    save={save} />
            </Field>
            <Field title={$L('Audio Language')}>
                <SelectLanguage
                    profile={profile}
                    languages={langList.audio}
                    name="preferred_content_audio_language"
                    save={save} />
            </Field>
            <Field title={$L('Subtitles Language')}>
                <SelectLanguage
                    profile={profile}
                    languages={langList.subtitles}
                    name="preferred_content_subtitle_language"
                    save={save} />
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
            label: PropTypes.string.isRequired,
            value: PropTypes.string.isRequired,
        })).isRequired,
        content: PropTypes.arrayOf(PropTypes.shape({
            label: PropTypes.string.isRequired,
            value: PropTypes.string.isRequired,
        })).isRequired,
        subtitles: PropTypes.arrayOf(PropTypes.shape({
            label: PropTypes.string.isRequired,
            value: PropTypes.string.isRequired,
        })).isRequired,
    }).isRequired,
    saveProfile: PropTypes.func.isRequired,
}

export default ProfileEdit
