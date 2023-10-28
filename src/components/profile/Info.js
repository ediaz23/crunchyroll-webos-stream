import { Column } from '@enact/ui/Layout'
import Image from '@enact/moonstone/Image'
import Heading from '@enact/moonstone/Heading'
import $L from '@enact/i18n/$L'
import Locale from 'ilib/lib/Locale'
import PropTypes from 'prop-types'

import css from './Info.module.less'
import Field from '../Field'
import { useGetLanguage } from '../../hooks/language'
import api from '../../api'


/**
 * @param {{profile: import('crunchyroll-js-api/src/types').Profile}}
 */
const ProfileInfo = ({ profile, ...rest }) => {
    const locale = new Locale()
    const getLanguage = useGetLanguage()

    return (
        <Column className={css.profileInfo} {...rest}>
            <Heading size="large">{$L('Information')}</Heading>
            <Heading size="small">{$L('Some info about your profile.')}</Heading>
            <Field>
                <Image src={api.assets.getAvatarUrl(profile)}
                    alt={$L('Profile Picture')}
                    style={{ height: '7.5rem', width: '7.5rem' }} />
            </Field>
            <Field title={$L('Username')}>
                {profile.username}
            </Field>
            <Field title={$L('Email')}>
                {profile.email}
            </Field>
            <Field title={$L('App Language')}>
                {getLanguage(locale.getSpec())}
            </Field>
        </Column >
    )
}

ProfileInfo.propTypes = {
    profile: PropTypes.object.isRequired,
}

export default ProfileInfo
