
import { useEffect, useState } from 'react'
import { Row, Cell } from '@enact/ui/Layout'
import $L from '@enact/i18n/$L'
import PropTypes from 'prop-types'

import { useSetRecoilState } from 'recoil'

import SelectLanguage from '../SelectLanguage'
import { ContentHeader } from '../home/ContentBanner'
import Field from '../Field'
import { currentProfileState } from '../../recoilConfig'
import { useMapLang } from '../../hooks/language'
import { useSaveOneProfileField } from '../../hooks/profile'
import css from './Series.module.less'


/**
 * @param {{
    profile:import('crunchyroll-js-api/src/types').Profile
    series: Object,
 }}
 */
const LangSelector = ({ profile, series, ...rest }) => {
    /** @type {Function} */
    const mapLang = useMapLang()
    /** @type {Function} */
    const setProfile = useSetRecoilState(currentProfileState)
    const { series_metadata } = series
    /** @type {{audio_locales: Array<String>, subtitle_locales: Array<String>}} */
    const { audio_locales, subtitle_locales } = (series_metadata || {})
    /** @type {[Array<{children: String, key: String}>, Function]} */
    const [audioLangList, setAudioLangList] = useState([])
    /** @type {[Array<{children: String, key: String}>, Function]} */
    const [subtitleLangList, setSubtitleLangList] = useState([])
    const saveAudio = useSaveOneProfileField({ profile, setProfile, field: 'preferred_content_audio_language' })
    const saveSubs = useSaveOneProfileField({ profile, setProfile, field: 'preferred_content_subtitle_language' })

    useEffect(() => {
        const loadData = async () => {
            if (audio_locales && audio_locales.length > 0) {
                setAudioLangList(audio_locales.map(mapLang))
            }
            if (subtitle_locales && subtitle_locales.length > 0) {
                setSubtitleLangList(['off', ...subtitle_locales].map(mapLang))
            }
        }
        loadData()
    }, [mapLang, audio_locales, subtitle_locales])

    return (
        <Row {...rest}>
            <Cell size="49%">
                <ContentHeader content={series} />
                {subtitleLangList && subtitleLangList.length > 0 && (
                    <Field title={$L('Subtitle')} className={css.firstData}>
                        <SelectLanguage
                            languages={subtitleLangList}
                            save={saveSubs}
                            value={profile.preferred_content_subtitle_language} />
                    </Field>
                )}
                {audioLangList && audioLangList.length > 0 && (
                    <Field title={$L('Audio')} className={css.firstData}>
                        <SelectLanguage
                            languages={audioLangList}
                            save={saveAudio}
                            value={profile.preferred_content_audio_language} />
                    </Field>
                )}
            </Cell>
        </Row>
    )
}

LangSelector.propTypes = {
    profile: PropTypes.object.isRequired,
    series: PropTypes.object.isRequired,
}

export default LangSelector
