import { Row, Cell } from '@enact/ui/Layout'
import PropTypes from 'prop-types'

import ProfileEdit from './Edit'
import ProfileInfo from './Info'
import css from './Detail.module.less'


/**
 * @param {import('./Edit').ProfileEditProps} obj
 */
const ProfileDetail = ({ profile, langList }) => {
    return (
        <Row align='baseline space-evenly' className={css.profileDetail} size="100%">
            <Cell>
                <ProfileInfo profile={profile} />
            </Cell>
            <Cell>
                <ProfileEdit profile={profile} langList={langList} />
            </Cell>
        </Row>
    )
}

ProfileDetail.propTypes = {
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

export default ProfileDetail
