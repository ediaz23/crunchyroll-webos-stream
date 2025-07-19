
import { useState, useCallback, useMemo } from 'react'
import { Row, Column } from '@enact/ui/Layout'
import { Panel, Header } from '@enact/moonstone/Panels'
import Heading from '@enact/moonstone/Heading'
import Dropdown from '@enact/moonstone/Dropdown'
import CheckboxItem from '@enact/moonstone/CheckboxItem'

import { ContactMeBtn, LogoutBtn } from '../components/Buttons'
import Field from '../components/Field'
import { dropdownKeydown } from '../components/SelectLanguage'
import css from '../components/profile/Detail.module.less'

import { $L } from '../hooks/language'
import { initCache } from '../hooks/customFetch'
import api from '../api'

/**
 * @param {Object} obj
 * @param {Function} obj.setAppConfig
 * @param {String} obj.field
 * @returns {Function}
 */
const useSaveConfigField = ({ setAppConfig, field }) => {
    return useCallback(value => {
        setAppConfig(p => {
            return { ...p, [field]: value }
        })
        api.config.setAppConfig({ [field]: value })
    }, [setAppConfig, field])
}


const AppConfigPanel = ({ noButtons, ...rest }) => {
    const [appConfig, setAppConfig] = useState(api.config.getAppConfig())

    /** -> UI */  // TODO: maybe hide banner?
    const saveUI = useSaveConfigField({ setAppConfig, field: 'ui' })
    const onToggleUI = useCallback(({ selected }) => saveUI(selected ? 'full' : 'lite'), [saveUI])

    /** -> preview */
    const savePreview = useSaveConfigField({ setAppConfig, field: 'preview' })
    const onTogglePreview = useCallback(({ selected }) => savePreview(selected ? 'yes' : 'no'), [savePreview])

    /** -> subtitle */
    const saveSubtitle = useSaveConfigField({ setAppConfig, field: 'subtitle' })
    const onToggleSubtitle = useCallback(({ selected }) => saveSubtitle(selected ? 'hardsub' : 'softsub'), [saveSubtitle])

    /** -> video */
    const videos = useMemo(() => ['adaptive', '2160p', '1080p', '720p', '480p', '360p', '240p'], [])
    const videoLabel = useMemo(() => {
        const vLable = {
            'adaptive': $L('Automatic'),
            '2160p': '4K (2160p)',
            '1080p': 'Full HD (1080p)',
            '720p': 'HD (720p)',
            '480p': 'SD (480p)',
            '360p': '360p',
            '240p': '240p'
        }
        return videos.map(i => vLable[i])
    }, [videos])
    const saveVideo = useSaveConfigField({ setAppConfig, field: 'video' })
    const onSelectVideo = useCallback(({ selected }) => saveVideo(videos[selected]), [videos, saveVideo])

    /** -> cache */
    const caches = useMemo(() => ['adaptive', '5', '10', '15', '20', '30', '50'], [])
    const cacheLabel = useMemo(() => {
        const vLable = {
            'adaptive': $L('Automatic'),
        }
        return caches.map(i => (vLable[i] || `${i} Mb`))
    }, [caches])
    const saveCache = useSaveConfigField({ setAppConfig, field: 'cacheMemory' })
    const onSelectCache = useCallback(({ selected }) => {
        saveCache(caches[selected])
        initCache()
    }, [caches, saveCache])

    return (
        <Panel {...rest}>
            <Header type='compact' hideLine>
                {!noButtons && <ContactMeBtn />}
                {!noButtons && <LogoutBtn />}
            </Header>
            <Row align='center center'>
                <Heading size='large'>
                    {$L('Configuration')}
                </Heading>
            </Row>
            <form className={css.profileDetail}>
                <Row align='baseline space-evenly' className={css.formContent}>
                    <Column className={css.formColumn}>
                        <Heading size="large">{$L('Player')}</Heading>
                        <Field size='large' title={$L('Video')}>
                            <Dropdown
                                title={$L('Video')}
                                selected={videos.indexOf(appConfig.video)}
                                width='x-large'
                                onSelect={onSelectVideo}
                                onKeyDown={dropdownKeydown}
                                showCloseButton>
                                {videoLabel}
                            </Dropdown>
                        </Field>
                        <Field title={$L('Subtitles')}>
                            <CheckboxItem
                                defaultSelected={appConfig.subtitle === 'hardsub'}
                                onToggle={onToggleSubtitle}>
                                {appConfig.subtitle === 'hardsub' ? $L('Hardsub') : $L('Softsub')}
                            </CheckboxItem>
                        </Field>
                        <Field title={$L('Previews')}>
                            <CheckboxItem
                                defaultSelected={appConfig.preview === 'yes'}
                                onToggle={onTogglePreview}>
                                {appConfig.preview === 'yes' ? $L('Yes') : $L('No')}
                            </CheckboxItem>
                        </Field>
                    </Column>
                    <Column className={css.formColumn}>
                        <Heading size="large">{$L('App')}</Heading>
                        <Field title={$L('Interface')}>
                            <CheckboxItem
                                defaultSelected={appConfig.ui === 'full'}
                                onToggle={onToggleUI}>
                                {appConfig.ui === 'full' ? $L('Full') : $L('Lite')}
                            </CheckboxItem>
                        </Field>
                        <Field size='large' title={$L('Cache Memory')}>
                            <Dropdown
                                title={$L('Cache Memory')}
                                selected={caches.indexOf(appConfig.cacheMemory)}
                                width='x-large'
                                onSelect={onSelectCache}
                                onKeyDown={dropdownKeydown}
                                showCloseButton>
                                {cacheLabel}
                            </Dropdown>
                        </Field>
                    </Column>
                </Row>
            </form>
        </Panel>
    )
}

export default AppConfigPanel
