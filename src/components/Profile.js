import { Row, Column } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import IconButton from '@enact/moonstone/IconButton'
import Image from '@enact/moonstone/Image'
import $L from '@enact/i18n/$L'
import PropTypes from 'prop-types'

import css from './Profile.module.less'
import Navigable from '../wrappers/Navigable'
import api from '../api'


/**
 * @param {{profile: import('crunchyroll-js-api/src/types').Profile, rest: Object}}
 */
const ProfileDataBase = ({ profile, ...rest }) => {

    return (
        <Row {...rest} data-profile-id={profile.id}>
            <Column >
                <Heading size="medium" style={{ marginBottom: '1rem' }}>
                    {profile.username}
                </Heading>
                <Image src={api.assets.getAvatarUrl(profile)}
                    alt={$L('Profile Picture')}
                    style={{ height: '10rem', width: '10rem' }} />
            </Column>
        </Row>
    )
}

const ProfileData = Navigable(ProfileDataBase, css.profileFocus)

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api/src/types').Profile} obj.profile
 * @param {Function} obj.onSelectProfile
 * @param {Function} obj.onEditProfile
 * @param {Object} obj.rest
 */
const Profile = ({ profile, onSelectProfile, onEditProfile, ...rest }) => {

    return (
        <Column className={css.profile} {...rest}>
            <ProfileData profile={profile} onClick={onSelectProfile} />
            <Row className={css.logoutButton} align="center center">
                <IconButton data-profile-id={profile.id}
                    onClick={onEditProfile}>
                    edit
                </IconButton>
            </Row>
        </Column>
    )
}

Profile.propTypes = {
    profile: PropTypes.object.isRequired,
    onSelectProfile: PropTypes.func.isRequired,
    onEditProfile: PropTypes.func.isRequired,
}

export default Profile
