
import { useEffect, useState, useCallback } from 'react'

import Scroller from '@enact/moonstone/Scroller'
import ExpandableList from '@enact/moonstone/ExpandableList'
import $L from '@enact/i18n/$L'

import { useSetRecoilState } from 'recoil'

import { currentProfileState } from '../recoilConfig'
import useGetLanguage from '../hooks/getLanguage'
import api from '../api'
import css from './ContentSerie.module.less'


/**
 * @param obj
 * @param {import('crunchyroll-js-api/src/types').Profile} obj.profile
 * @param {Object} content
 */
const ContentSerieLangSelector = ({ profile, serie, ...rest }) => {
    /** @type {Function} */
    const getLanguage = useGetLanguage()
    /** @type {Function} */
    const setProfile = useSetRecoilState(currentProfileState)
    const { series_metadata } = serie
    /** @type {{audio_locales: Array<String>, subtitle_locales: Array<String>}} */
    const { audio_locales, subtitle_locales } = (series_metadata || {})
    /** @type {[Array<{children: String, key: String}>, Function]} */
    const [audioLangList, setAudioLangList] = useState([])
    /** @type {[Array<{children: String, key: String}>, Function]} */
    const [subtitleLangList, setSubtitleLangList] = useState([])

    const convertLang = useCallback(lang => {
        return { children: getLanguage(lang), key: lang }
    }, [getLanguage])

    const saveProfile = useCallback(async (newValue) => {
        await api.account.updateProfile(newValue)
        setProfile({ ...profile, ...newValue })
    }, [setProfile, profile])

    const onSelectAudio = useCallback(async ({ selected }) => {
        await saveProfile({ preferred_content_audio_language: audioLangList[selected].key })
    }, [saveProfile, audioLangList])

    const onSelectSubtitle = useCallback(async ({ selected }) => {
        await saveProfile({ preferred_content_subtitle_language: subtitleLangList[selected].key })
    }, [saveProfile, subtitleLangList])

    useEffect(() => {
        const loadData = async () => {
            if (audio_locales && audio_locales.length > 0) {
                setAudioLangList(audio_locales.map(convertLang))
            }
            if (subtitle_locales && subtitle_locales.length > 0) {
                setSubtitleLangList(['off', ...subtitle_locales].map(convertLang))
            }
        }
        loadData()
    }, [convertLang, getLanguage, audio_locales, subtitle_locales])

    return (
        <Scroller direction='vertical' horizontalScrollbar='hidden'
            verticalScrollbar='visible' className={css.scrollerOption} {...rest}>
            <div className={css.langContainer} >
                {subtitleLangList && subtitleLangList.length > 0 && (
                    <ExpandableList select='radio' title={$L('Subtitle')}
                        onSelect={onSelectSubtitle}
                        selected={subtitle_locales.indexOf(profile.preferred_content_subtitle_language)}>
                        {subtitleLangList}
                    </ExpandableList>
                )}
                {audioLangList && audioLangList.length > 0 && (
                    <ExpandableList select='radio' title={$L('Audio')}
                        onSelect={onSelectAudio}
                        selected={audio_locales.indexOf(profile.preferred_content_audio_language)}>
                        {audioLangList}
                    </ExpandableList>
                )}
            </div>
        </Scroller>
    )
}

export default ContentSerieLangSelector
