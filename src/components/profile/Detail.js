
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Row, Column } from '@enact/ui/Layout'
import FloatingLayer from '@enact/ui/FloatingLayer'
import ri from '@enact/ui/resolution'
import Spotlight from '@enact/spotlight'
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator'
import Heading from '@enact/moonstone/Heading'
import Dropdown from '@enact/moonstone/Dropdown'
import Input from '@enact/moonstone/Input'
import Image from '@enact/moonstone/Image'
import Button from '@enact/moonstone/Button'
import Icon from '@enact/moonstone/Icon'
import IconButton from '@enact/moonstone/IconButton'
import Spinner from '@enact/moonstone/Spinner'
import { VirtualGridList } from '@enact/moonstone/VirtualList'
import GridListImageItem from '@enact/moonstone/GridListImageItem'
import PropTypes from 'prop-types'
import Locale from 'ilib/lib/Locale'

import { $L } from '../../hooks/language'
import Field from '../Field'
import SelectLanguage, { dropdownKeydown } from '../SelectLanguage'
import Alert from '../Alert'
import PopupMessage from '../Popup'
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
 * @param {Function} obj.onShowSelectAvatar
 */
const ProfileInfo = ({ profile, setProfile, usernames, onShowSelectAvatar }) => {
    /** @type {[Boolean, Function]} */
    const [inputInvalid, setInputInvalid] = useState(false)
    /** @type {Function} */
    const saveName = useSaveProfileField({ setProfile, field: 'profile_name' })
    /** @type {Function} */
    const saveUsername = useSaveProfileField({ setProfile, field: 'username' })
    /** @type {Function} */
    const onChangeName = useCallback(({ value }) => {
        setInputInvalid(false)
        saveName(value)
    }, [saveName, setInputInvalid])
    /** @type {Function} */
    const onSelectUsername = useCallback(({ selected }) => {
        saveUsername(usernames[selected])
    }, [usernames, saveUsername])
    /** @type {Function} */
    const onInvalid = useCallback(() => {
        setInputInvalid(true)
    }, [setInputInvalid])

    useEffect(() => {
        setTimeout(() => Spotlight.focus(), 100)
    }, [])

    useEffect(() => {
        if (profile.profile_id && !profile.username) {
            onSelectUsername({ selected: 0 })
        }
    }, [profile, onSelectUsername])

    return (
        <Column className={css.formColumn}>
            <Heading size="large">{$L('Information')}</Heading>
            <Heading size="small">{$L('Some info about your profile')}</Heading>
            <Field type='image'>
                <Image
                    src={api.assets.getAvatarUrl(profile.avatar)}
                    alt={$L('Profile Picture')} />
                <IconButton onClick={onShowSelectAvatar}>
                    edit
                </IconButton>
            </Field>
            <Field type='input' title={$L('Name')}>
                <Input value={profile.profile_name}
                    className={css.input}
                    onChange={onChangeName}
                    onInvalid={onInvalid}
                    invalid={inputInvalid}
                    invalidMessage={$L('Only accepts numbers and letters, at least 2 characters')}
                    pattern="[a-zA-Z0-9]{2,50}"
                    size='small'
                    required
                />
            </Field>
            <Field type={profile.profile_id ? 'text' : null} title={$L('Username')}
                size={profile.profile_id ? 'small' : 'normal'}>
                {profile.profile_id ?
                    profile.username || 'Profile'
                    :
                    <Dropdown title={$L('Username')}
                        selected={usernames.indexOf(profile.username)}
                        width='x-large'
                        onSelect={onSelectUsername}
                        onKeyDown={dropdownKeydown}
                        showCloseButton>
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

    return (
        <Column className={css.formColumn}>
            <Heading size="large">{$L('Preferences')}</Heading>
            <Heading size="small">{$L('Set your language, video preferences')}</Heading>
            <Field size='large' title={$L('Content Language')}>
                <SelectLanguage
                    languages={contentLangs}
                    save={saveLang}
                    value={profile.preferred_communication_language || defaultLang} />
            </Field>
            <Field size='large' title={$L('Audio Language')}>
                <SelectLanguage
                    languages={audioLangs}
                    save={saveAudio}
                    value={profile.preferred_content_audio_language || defaultLang} />
            </Field>
            <Field size='large' title={$L('Subtitles Language')}>
                <SelectLanguage
                    languages={subtitleLangs}
                    save={saveSubs}
                    value={profile.preferred_content_subtitle_language || defaultLang} />
            </Field>
        </Column>
    )
}

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Function} obj.onShowDeleteProfile
 * @param {Function} obj.onSave
 */
const ProfileAction = ({ profile, onShowDeleteProfile, onSave }) => {
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
            <Field type='text' title={$L('Email')} >
                {profile.email}
            </Field>
            <Field type='text' title={$L('App Language')}>
                {lang}
            </Field>
            <Row className={css.actions} align='center center' size="100%">
                <Column className={css.buttonContainer} size="100%">
                    <Button onClick={onSave}>
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
 * @param {Boolean} obj.open
 * @param {Array<import('crunchyroll-js-api').Types.AssesItem>} obj.avatars
 * @param {Function} obj.setProfile
 */
const AvatarGridBase = ({ open, avatars, setProfile, ...rest }) => {
    /** @type {[Function, Function]} */
    const [makeFocus, setMakeFocus] = useState(null)
    /** @type {[Array<String>, Function]} */
    const [albums, setAlbums] = useState([])
    /** @type {[Number, Function]} */
    const [albumSelected, setAlbumSelected] = useState(-1)
    /** @type {[Array<{url: String, title: String, subTitle: String, id: String}>, Function]} */
    const [avatarsList, setAvatarsList] = useState([])

    /** @type {Function} */
    const saveAvatar = useSaveProfileField({ setProfile, field: 'avatar' })

    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { setMakeFocus(() => scrollTo) }, [])

    /** @type {Function} */
    const onSelectItem = useCallback((ev) => {
        if (ev.currentTarget) {
            const index = parseInt(ev.currentTarget.dataset['index'])
            saveAvatar(avatarsList[index].id)
            back.doBack()
        }
    }, [avatarsList, saveAvatar])

    /** @type {Function} */
    const onSelectAlbum = useCallback(({ selected }) => {
        setAlbumSelected(selected)
    }, [setAlbumSelected])

    /** @type {Function} */
    const renderItem = useCallback(({ index, ...rest2 }) => {
        const contentItem = avatarsList[index]
        return (
            <GridListImageItem
                {...rest2}
                data-index={index}
                source={contentItem.url}
                caption={contentItem.title || ''}
                subCaption={contentItem.subTitle || ''}
                onClick={onSelectItem}
            />
        )
    }, [avatarsList, onSelectItem])

    useEffect(() => {
        setAlbums(avatars.map(item => item.title))
        setAlbumSelected(0)
    }, [avatars, setAlbums, setAlbumSelected])

    useEffect(() => {
        if (albumSelected >= 0) {
            setAvatarsList(avatars[albumSelected].assets.map(item => {
                return {
                    id: item.id,
                    url: api.assets.getAvatarUrl(item.id),
                    title: avatars[albumSelected].title,
                    subTitle: item.title,
                }
            }))
        }
    }, [avatars, albumSelected, setAvatarsList])

    useEffect(() => {
        if (makeFocus) {
            makeFocus({ index: 0, animate: false, focus: true })
        }
    }, [makeFocus])

    return (
        <FloatingLayer open={open} noAutoDismiss
            style={{ backgroundColor: '#000000', padding: '1.6rem' }} {...rest}>
            <Column>
                <Dropdown title={$L('Albums')}
                    className='spottable-default'
                    selected={albumSelected}
                    width='x-large'
                    onSelect={onSelectAlbum}
                    style={{ marginBottom: '1rem' }}
                    onKeyDown={dropdownKeydown}
                    showCloseButton>
                    {albums}
                </Dropdown>
                <VirtualGridList
                    className={css.avatarList}
                    dataSize={avatarsList.length}
                    itemRenderer={renderItem}
                    itemSize={{ minHeight: ri.scale(200), minWidth: ri.scale(200) }}
                    spacing={ri.scale(25)}
                    cbScrollTo={getScrollTo}
                />
            </Column>
        </FloatingLayer>
    )
}

const AvatarGrid = SpotlightContainerDecorator({
    enterTo: 'default-element',
    defaultElement: '.spottable-default',
    restrict: 'self-only',
    leaveFor: { left: '', right: '', up: '', down: '' },
}, AvatarGridBase)

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {import('crunchyroll-js-api').Types.Profile} obj.oldProfile
 * @returns {Promise}
 */
const saveProfile = async ({ profile, oldProfile }) => {
    const fields = [
        'profile_name', 'username', 'avatar', 'wallpaper',
        'maturity_rating',
        'preferred_communication_language',
        'preferred_content_audio_language',
        'preferred_content_subtitle_language']
    let body = {}
    if (oldProfile.profile_id) {
        for (const field of fields) {
            if (profile[field] !== oldProfile[field]) {
                body[field] = profile[field]
            }
        }
    } else {
        for (const field of fields) {
            body[field] = profile[field]
        }
    }
    if (Object.keys(body).length) {
        if (oldProfile.profile_id) {
            await api.account.updateProfile(oldProfile.profile_id, body)
        } else {
            await api.account.createProfile(body)
        }
    }
}

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Array<import('../SelectLanguage').LangTuple>} obj.audioLangs
 * @param {Array<import('../SelectLanguage').LangTuple>} obj.subtitleLangs
 * @param {Array<import('../SelectLanguage').LangTuple>} obj.contentLangs
 * @param {Array<String>} obj.usernames
 * @param {Array<import('crunchyroll-js-api').Types.AssesItem>} obj.avatars
 */
const ProfileDetail = ({ profile: profileBase, audioLangs, subtitleLangs, contentLangs, usernames, avatars }) => {
    /** @type {{current: HTMLFormElement}} */
    const formRef = useRef(null)
    /** @type {[import('crunchyroll-js-api').Types.Profile, Function]} */
    const [profile, setProfile] = useState(profileBase)
    /** @type {[String, Function]}  */
    const [message, setMessage] = useState('')
    /** @type {[Boolean, Function]} */
    const [askDelete, setAskDelete] = useState(false)
    /** @type {[Boolean, Function]} */
    const [selectAvatar, setSelectAvatar] = useState(false)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(false)

    /** @type {Function} */
    const onClosePopup = useCallback(() => setMessage(''), [setMessage])

    const onShowSelectAvatar = useCallback(() => {
        back.pushHistory({
            doBack: () => {
                setSelectAvatar(false)
                setTimeout(() => Spotlight.focus(), 100)
            }
        })
        setSelectAvatar(true)
    }, [setSelectAvatar])

    /** @type {Function} */
    const onShowDeleteProfile = useCallback(() => {
        back.pushHistory({
            doBack: () => {
                setAskDelete(false)
                setTimeout(() => Spotlight.focus(), 100)
            }
        })
        setAskDelete(true)
    }, [setAskDelete])

    /** @type {Function} */
    const onHideDeleteProfile = useCallback(() => {
        back.doBack()
    }, [])

    /** @type {Function} */
    const deleteProfile = useCallback(() => {
        back.doBack()
        setLoading(true)
        api.account.deleteProfile(profile.profile_id)
            .then(() => back.doBack())
            .catch(err => setMessage(err.message))
            .finally(() => setLoading(false))
    }, [profile, setLoading, setMessage])

    /** @type {Function} */
    const onSave = useCallback(() => {
        if (formRef.current.checkValidity()) {
            setLoading(true)
            saveProfile({ profile, oldProfile: profileBase })
                .then(() => back.doBack())
                .catch(err => setMessage(err.message))
                .finally(() => setLoading(false))
        }
    }, [profile, setLoading, setMessage, profileBase])

    return (
        <form id="profileForm" className={css.profileDetail} ref={formRef}>
            <Row align='baseline space-evenly' className={css.formContent}>
                {!loading ?
                    <>
                        <ProfileInfo
                            profile={profile}
                            usernames={usernames}
                            setProfile={setProfile}
                            onShowSelectAvatar={onShowSelectAvatar} />
                        <ProfileLang
                            profile={profile}
                            setProfile={setProfile}
                            audioLangs={audioLangs}
                            contentLangs={contentLangs}
                            subtitleLangs={subtitleLangs} />
                        <ProfileAction
                            profile={profile}
                            onShowDeleteProfile={onShowDeleteProfile}
                            onSave={onSave} />
                    </>
                    :
                    <Spinner />
                }
            </Row>
            <AvatarGrid
                open={selectAvatar}
                avatars={avatars}
                setProfile={setProfile} />
            <PopupMessage show={!!message} type='error' onClose={onClosePopup}>
                {message}
            </PopupMessage>
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
