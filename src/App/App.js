
import { useEffect, useState, useCallback, useMemo } from 'react'
import MoonstoneDecorator from '@enact/moonstone/MoonstoneDecorator'
import { Panels, Routable, Route } from '@enact/moonstone/Panels'
import LocaleInfo from 'ilib/lib/LocaleInfo'
import I18nDecorator from '@enact/i18n/I18nDecorator'
import regions from 'i18n-iso-m49'
import countries from 'i18n-iso-countries'
import languages from '@cospired/i18n-iso-languages'

import { useRecoilState, useSetRecoilState } from 'recoil'

import { pathState, initScreenState, contactBtnState } from '../recoilConfig'
import ErrorBoundary from '../components/ErrorBoundary'
import InitialPanel from '../views/InitialPanel'
import HomePanel from '../views/HomePanel'
import PlayerPanel from '../views/PlayerPanel'
import WarningPanel from '../views/WarningPanel'
import LoginPanel from '../views/LoginPanel'
import ContactMePanel from '../views/ContactMePanel'
import ProfilesPanel from '../views/ProfilesPanel'
import ConfirmExitPanel from '../views/ConfirnExitPanel'
import ProfileEditPanel from '../views/ProfileEditPanel'
import ContentPanel from '../views/ContentPanel'
import DeveloperPanel from '../views/DeveloperPanel'
import useCustomFetch from '../hooks/customFetch'
import api from '../api'
import utils from '../utils'
import back from '../back'
import css from './App.module.less'
import './attachErrorHandler'


const RoutablePanels = Routable({ navigate: 'onBack' }, Panels)

const App = ({ ...rest }) => {
    /** @type {Function} */
    const customFetch = useCustomFetch()
    /** @type {[String, Function]} */
    const [dbInit, setDBInit] = useState(false)
    /** @type {[String, Function]} */
    const [path, setPath] = useRecoilState(pathState)
    /** @type {Function} */
    const setInitScreenState = useSetRecoilState(initScreenState)
    /** @type {Function} */
    const setContactBtn = useSetRecoilState(contactBtnState)
    const newClassName = useMemo(() => `${rest.className} ${css.app}`, [rest.className])

    const closeApp = useCallback(() => {
        if (utils.isTv()) {
            window.close()
        }
    }, [])

    useEffect(() => {
        const loadData = async () => {
            let initPath
            if (await api.config.isNewInstallation()) {
                initPath = '/warning'
            } else if ((new Date()) > await api.config.getNextContactDate()) {
                initPath = '/contact'
                setContactBtn(true)
            } else {
                initPath = '/login'
            }
            setInitScreenState(initPath)
            setPath(initPath)
        }
        if (dbInit) {
            loadData()
        }
    }, [dbInit, setPath, setInitScreenState, setContactBtn])

    useEffect(() => {
        if (dbInit) {
            back.pushHistory({ doBack: () => setPath('/askClose') })
        }
    }, [dbInit, setPath])

    useEffect(() => {
        const initDB = async () => {
            await api.config.init()
            api.config.setCustomFetch(customFetch)
            await api.config.setDeviceInformation()
            setDBInit(true)
        }
        initDB()
    }, [setDBInit, customFetch])

    return (
        <ErrorBoundary {...rest}>
            <div {...rest} className={newClassName}>
                <RoutablePanels {...rest} path={path} onApplicationClose={closeApp} noCloseButton>
                    <Route path='init' component={InitialPanel} {...rest} />
                    <Route path='warning' component={WarningPanel} {...rest} />
                    <Route path='login' component={LoginPanel} {...rest} />
                    <Route path='profiles' component={ProfilesPanel} {...rest} >
                        <Route path='edit' component={ProfileEditPanel} {...rest} />
                        <Route path='home' component={HomePanel} {...rest}>
                            <Route path='content' component={ContentPanel} {...rest} />
                            <Route path='player' component={PlayerPanel} {...rest} />
                        </Route>
                    </Route>
                    <Route path='contact' component={ContactMePanel} {...rest} />
                    <Route path='askClose' component={ConfirmExitPanel} {...rest} />
                    <Route path='developer' component={DeveloperPanel} {...rest} />
                </RoutablePanels>
            </div>
        </ErrorBoundary>
    )
}

const AppLocal = I18nDecorator({
    resources: [{
        resource: async options => {
            const localeInfo = new LocaleInfo(options.locale).getLocale()
            const prom = []
            if (process.env.REACT_APP_SERVING === 'true') {
                prom.push(utils.loadBrowserTranslate(
                    import(`i18n-iso-countries/langs/${localeInfo.language}.json`),
                    () => import(`i18n-iso-countries/langs/en.json`)
                ))
                prom.push(utils.loadBrowserTranslate(
                    import(`i18n-iso-m49/langs/${localeInfo.language}.json`),
                    () => import(`i18n-iso-m49/langs/en.json`)
                ))
                prom.push(utils.loadBrowserTranslate(
                    import(`@cospired/i18n-iso-languages/langs/${localeInfo.language}.json`),
                    () => import(`@cospired/i18n-iso-languages/langs/en.json`)
                ))
            } else {
                prom.push(utils.loadTvTranslate('i18n-iso-countries', localeInfo.language))
                prom.push(utils.loadTvTranslate('i18n-iso-m49', localeInfo.language))
                prom.push(utils.loadTvTranslate('@cospired/i18n-iso-languages', localeInfo.language))
            }
            const [countryData, regionData, langData] = await Promise.all(prom)
            regions.registerLocale(countries, countryData, regionData)
            languages.registerLocale(langData)
        },
    }]
}, App)

const AppTheme = MoonstoneDecorator(AppLocal)

export default AppTheme
