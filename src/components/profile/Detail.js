
import { useState, useMemo, useCallback } from 'react'
import { Row, Column } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import Dropdown from '@enact/moonstone/Dropdown'
import Input from '@enact/moonstone/Input'
import Image from '@enact/moonstone/Image'
import CheckboxItem from '@enact/moonstone/CheckboxItem'
import Button from '@enact/moonstone/Button'
import Icon from '@enact/moonstone/Icon'
import IconButton from '@enact/moonstone/IconButton'
import Spinner from '@enact/moonstone/Spinner'
import PropTypes from 'prop-types'
import Locale from 'ilib/lib/Locale'

import { $L } from '../../hooks/language'
import Field from '../Field'
import SelectLanguage from '../SelectLanguage'
import Alert from '../Alert'
import css from './Detail.module.less'
import { useGetLanguage } from '../../hooks/language'
import api from '../../api'
import back from '../../back'


/**
 * @param {Object} obj
 * @param {Function} obj.setProfile
 * @param {String} obj.field
 * @returns {Function}
 */
const useSaveProfileField = ({ setProfile, field }) => {
    return useCallback(value => {
        setProfile(p => {
            return { ...p, [field]: value }
        })
    }, [setProfile, field])
}

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Function} obj.setProfile
 * @param {Array<String>} obj.usernames
 */
const ProfileInfo = ({ profile, setProfile, usernames }) => {
    /** @type {Function} */
    const saveName = useSaveProfileField({ setProfile, field: 'profile_name' })
    /** @type {Function} */
    const saveUsername = useSaveProfileField({ setProfile, field: 'username' })
    /** @type {Function} */
    const onChangeName = useCallback(({ value }) => saveName(value), [saveName])
    /** @type {Function} */
    const onSelectUsername = useCallback(({ selected }) => {
        saveUsername(usernames[selected])
    }, [usernames, saveUsername])

    return (
        <Column className={css.formColumn}>
            <Heading size="large">{$L('Information')}</Heading>
            <Heading size="small">{$L('Some info about your profile')}</Heading>
            <Field className={css.imageField}>
                <Image className={css.image}
                    src={api.assets.getAvatarUrl(profile.avatar)}
                    alt={$L('Profile Picture')} />
                <IconButton className={css.button}>
                    edit
                </IconButton>
            </Field>
            <Field className={css.inputField} title={$L('Name')}>
                <Input value={profile.profile_name}
                    className={css.input}
                    onChange={onChangeName}
                    pattern="[a-zA-Z0-9]{2,50}"
                    size='small'
                    required />
            </Field>
            <Field className={profile.profile_id ? css.textField : ''} title={$L('Username')}>
                {profile.profile_id ?
                    profile.username
                    :
                    <Dropdown title={$L('Username')}
                        selected={usernames.indexOf(profile.username)}
                        width='x-large'
                        onSelect={onSelectUsername}>
                        {usernames}
                    </Dropdown>
                }
            </Field>
        </Column>
    )
}

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Function} obj.setProfile
 * @param {Array<import('../SelectLanguage').LangTuple>} obj.audioLangs
 * @param {Array<import('../SelectLanguage').LangTuple>} obj.subtitleLangs
 * @param {Array<import('../SelectLanguage').LangTuple>} obj.contentLangs
 */
const ProfileLang = ({ profile, setProfile, audioLangs, subtitleLangs, contentLangs }) => {
    const defaultLang = 'en-US'
    /** @type {Function} */
    const saveLang = useSaveProfileField({ setProfile, field: 'preferred_communication_language' })
    /** @type {Function} */
    const saveAudio = useSaveProfileField({ setProfile, field: 'preferred_content_audio_language' })
    /** @type {Function} */
    const saveSubs = useSaveProfileField({ setProfile, field: 'preferred_content_subtitle_language' })
    /** @type {Function} */
    const saveAdult = useSaveProfileField({ setProfile, field: 'maturity_rating' })
    /** @type {Function} */
    const onToggleAdult = useCallback(({ selected }) => {
        saveAdult({ maturity_rating: selected ? 'M3' : 'M2' })
    }, [saveAdult])

    return (
        <Column className={css.formColumn}>
            <Heading size="large">{$L('Preferences')}</Heading>
            <Heading size="small">{$L('Set your language, video preferences')}</Heading>
            <Field title={$L('Content Language')}>
                <SelectLanguage
                    languages={contentLangs}
                    save={saveLang}
                    value={profile.preferred_communication_language || defaultLang} />
            </Field>
            <Field title={$L('Audio Language')}>
                <SelectLanguage
                    languages={audioLangs}
                    save={saveAudio}
                    value={profile.preferred_content_audio_language || defaultLang} />
            </Field>
            <Field title={$L('Subtitles Language')}>
                <SelectLanguage
                    languages={subtitleLangs}
                    save={saveSubs}
                    value={profile.preferred_content_subtitle_language || defaultLang} />
            </Field>
            <Field >
                <CheckboxItem defaultSelected={profile.maturity_rating === 'M3'}
                    onToggle={onToggleAdult}>
                    {$L('Adult content')}
                </CheckboxItem>
            </Field>
        </Column>
    )
}

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Function} obj.onShowDeleteProfile
 */
const ProfileAction = ({ profile, onShowDeleteProfile }) => {
    /** @type {Function} */
    const getLanguage = useGetLanguage()
    /** @type {String} */
    const lang = useMemo(() => {
        const locale = new Locale()
        return getLanguage(locale.getSpec())
    }, [getLanguage])
    /** @type {Function} */
    const onBack = useCallback(() => {
        back.doBack()
    }, [])

    return (
        <Column className={css.formColumn}>
            <Heading size="large">{$L('Actions')}</Heading>
            <Heading size="small">{$L('Save changes')}</Heading>
            <Field className={css.textField} title={$L('Email')} >
                {profile.email}
            </Field>
            <Field className={css.textField} title={$L('App Language')}>
                {lang}
            </Field>
            <Row className={css.actions} align='center center' size="100%">
                <Column className={css.buttonContainer} size="100%">
                    <Button>
                        <Icon className={css.buttonIcon}>
                            checkselection
                        </Icon>
                        {$L('Save')}
                    </Button>
                    <Button onClick={onBack}>
                        <Icon className={css.buttonIcon}>
                            arrowhookleft
                        </Icon>
                        {$L('Back')}
                    </Button>
                    {profile.profile_id && !profile.is_primary &&
                        <Button onClick={onShowDeleteProfile}>
                            <Icon className={css.buttonIcon}>
                                trash
                            </Icon>
                            {$L('Delete')}
                        </Button>
                    }
                </Column>
            </Row>
        </Column>
    )
}

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Array<import('../SelectLanguage').LangTuple>} obj.audioLangs
 * @param {Array<import('../SelectLanguage').LangTuple>} obj.subtitleLangs
 * @param {Array<import('../SelectLanguage').LangTuple>} obj.contentLangs
 * @param {Array<String>} obj.usernames
 */
const ProfileDetail = ({ profile: profileBase, audioLangs, subtitleLangs, contentLangs, usernames }) => {
    /** @type {[import('crunchyroll-js-api').Types.Profile, Function]} */
    const [profile, setProfile] = useState(profileBase)
    /** @type {[Boolean, Function]} */
    const [askDelete, setAskDelete] = useState(false)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(false)

    /** @type {Function} */
    const deleteProfile = useCallback(() => {
        back.doBack()
        setLoading(true)
        /**
         * @todo borrar y regresar
         */
    }, [setLoading])

    /** @type {Function} */
    const onShowDeleteProfile = useCallback(() => {
        back.pushHistory({ doBack: () => { setAskDelete(false) } })
        setAskDelete(true)
    }, [setAskDelete])

    /** @type {Function} */
    const onHideDeleteProfile = useCallback(() => {
        back.doBack()
    }, [])

    // avatars

    return (
        <form id="profileForm" className={css.profileDetail}>
            <Row align='baseline space-evenly' className={css.formContent}>
                {!loading ?
                    <>
                        <ProfileInfo
                            profile={profile}
                            usernames={usernames}
                            setProfile={setProfile} />
                        <ProfileLang
                            profile={profile}
                            setProfile={setProfile}
                            audioLangs={audioLangs}
                            contentLangs={contentLangs}
                            subtitleLangs={subtitleLangs} />
                        <ProfileAction
                            profile={profile}
                            onShowDeleteProfile={onShowDeleteProfile} />
                    </>
                    :
                    <Spinner />
                }
            </Row>
            <Alert open={askDelete}
                title={$L('Delete Profile')}
                message={$L('Are you sure you want to delete this profile?')}
                onAccept={deleteProfile}
                onCancel={onHideDeleteProfile} />
        </form>
    )
}

const langListType = PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    children: PropTypes.string.isRequired,
})).isRequired

const assesListType = PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string.isRequired,
    assets: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
    })).isRequired
})).isRequired

ProfileDetail.propTypes = {
    profile: PropTypes.object.isRequired,
    audioLangs: langListType,
    subtitleLangs: langListType,
    contentLangs: langListType,
    usernames: PropTypes.arrayOf(PropTypes.string).isRequired,
    avatars: assesListType,
    wallpapers: assesListType,
}

export default ProfileDetail
