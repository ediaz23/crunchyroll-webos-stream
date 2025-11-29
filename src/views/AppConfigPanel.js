
import { useState, useCallback, useMemo, useEffect } from 'react'
import { Row, Column } from '@enact/ui/Layout'
import ri from '@enact/ui/resolution'
import { Panel, Header } from '@enact/moonstone/Panels'
import Heading from '@enact/moonstone/Heading'
import Dropdown from '@enact/moonstone/Dropdown'
import CheckboxItem from '@enact/moonstone/CheckboxItem'
import Spinner from '@enact/moonstone/Spinner'
import Item from '@enact/moonstone/Item';

import { ContactMeBtn, LogoutBtn, AppIconButton } from '../components/Buttons'
import PopupMessage from '../components/Popup'
import Field from '../components/Field'
import { dropdownKeydown } from '../components/SelectLanguage'
import Scroller from '../patch/Scroller'
import css from '../components/profile/Detail.module.less'

import { $L } from '../hooks/language'
import { initCache } from '../hooks/customFetch'
import { syncFonts, getFonts } from '../hooks/fonts'
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
    const [isLogged, setIsLogged] = useState(false)
    const [loading, setLoading] = useState(false)
    /** @type {[{type: String, message: String}, Function]}  */
    const [message, setMessage] = useState(null)
    const [fontList, setFontList] = useState([])

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

    const doSyncFonts = useCallback(async () => {
        setLoading(true)
        syncFonts()
            .then(() => getFonts())
            .then(fontsData => {
                setMessage({ type: 'info', message: 'Okey' })
                setFontList(fontsData.names)
                setTimeout(() => setMessage(null), 1500)
            }).catch(err => {
                console.error(err)
                if (err) {
                    setMessage({ type: 'error', message: err.message || `${err}` })
                } else {
                    setMessage({ type: 'error', message: $L('An error occurred') })
                }
            }).finally(() => setLoading(false))
    }, [setMessage, setLoading])

    useEffect(() => {
        getFonts().then(fontsData => setFontList(fontsData.names))
    }, [setFontList])

    useEffect(() => {
        api.auth.getSession().then(token => setIsLogged(!!token))
    }, [])

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
                    {isLogged &&
                        <Column className={css.formColumn}>
                            <Heading size="large">{$L('Fonts')}</Heading>
                            <Field size='large' title={$L('Sync')}>
                                {loading && <Spinner />}
                                {!loading &&
                                    <AppIconButton
                                        mode='full'
                                        icon='gear'
                                        tooltipText={$L('Sync Fonts')}
                                        onClick={doSyncFonts}
                                    />
                                }
                            </Field>
                            <Field size='large' title={$L('Available Fonts')}>
                                <div style={{ height: ri.scale(200), width: ri.scale(350) }}>
                                    <Scroller direction='vertical'
                                        horizontalScrollbar='hidden'
                                        verticalScrollbar='visible'>
                                        {fontList.map(item => <Item key={item}>{item}</Item>)}
                                    </Scroller>
                                </div>
                            </Field>
                        </Column>
                    }
                </Row>
                <PopupMessage show={!!(message?.type)} type={message?.type}>
                    {message?.message || 'nothing'}
                </PopupMessage>
            </form>
        </Panel>
    )
}

export default AppConfigPanel
