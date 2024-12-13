
import { Row, Column } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import IconButton from '@enact/moonstone/IconButton'
import Image from '@enact/moonstone/Image'
import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import css from './Profile.module.less'
import withNavigable from '../../hooks/navigable'
import api from '../../api'
import kidImg from '../../../assets/img/child.jpg'


const ImageNavigable = withNavigable(Image, css.profileFocus)

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Function} obj.onSelectProfile
 * @param {Function} obj.onEditProfile
 * @param {Function} obj.compRef
 * @param {Object} obj.rest
 */
const Profile = ({ profile, onSelectProfile, onEditProfile, compRef, ...rest }) => {

    return (
        <Column className={css.profile} {...rest}>
            <Row align="center center">
                <Column align="center center">
                    <ImageNavigable
                        data-profile-id={profile.profile_id}
                        className={css.profileImg}
                        src={profile.avatar && api.assets.getAvatarUrl(profile.avatar) || kidImg}
                        alt={$L('Profile Picture')}
                        onClick={onSelectProfile}
                        ref={compRef} />
                    <Heading size="medium">
                        {profile.profile_name}
                    </Heading>
                </Column>
            </Row>
            <Row className={css.editButton} align="center center">
                <IconButton data-profile-id={profile.profile_id}
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
    compRef: PropTypes.func.isRequired,
}

export default Profile
