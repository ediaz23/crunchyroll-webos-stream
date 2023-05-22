import { Row, Cell } from '@enact/ui/Layout'
import PropTypes from 'prop-types'

import ProfileEdit from './ProfileEdit'
import ProfileInfo from './ProfileInfo'
import css from './ProfileDetail.module.less'


/**
 * @param {import('./ProfileEdit').ProfileEditProps} obj
 */
const ProfileDetail = ({ profile, langList, saveProfile }) => {
    return (
        <Row className={css.profileDetail} size="100%">
            <Cell>
                <ProfileInfo profile={profile} />
            </Cell>
            <Cell>
                <ProfileEdit profile={profile} langList={langList} saveProfile={saveProfile} />
            </Cell>
        </Row>
    )
}

ProfileDetail.propTypes = {
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

export default ProfileDetail
