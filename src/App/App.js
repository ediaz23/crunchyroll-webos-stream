
import { useEffect, useState, useCallback } from 'react'
import languages from '@cospired/i18n-iso-languages'
import LocaleInfo from 'ilib/lib/LocaleInfo'
import I18nDecorator from '@enact/i18n/I18nDecorator'
import MoonstoneDecorator from '@enact/moonstone/MoonstoneDecorator'
import { Panels, Routable, Route } from '@enact/moonstone/Panels'

import { useRecoilState, useSetRecoilState } from 'recoil'

import { pathState, initScreenState } from '../recoilConfig'
import ErrorBoundary from '../components/ErrorBoundary'
import InitialPanel from '../views/InitialPanel'
import HomePanel from '../views/HomePanel'
//import PlayerPanel from '../views/PlayerPanel'
import WarningPanel from '../views/WarningPanel'
import LoginPanel from '../views/LoginPanel'
import ContactMePanel from '../views/ContactMePanel'
import ProfilesPanel from '../views/ProfilesPanel'
import ConfirmExitPanel from '../views/ConfirnExitPanel'
import ProfileEditPanel from '../views/ProfileEditPanel'
import ContentSeriePanel from '../views/ContentSeriePanel'
import useCustomFetch from '../hooks/customFetch'
import api from '../api'
//import logger from '../logger'
import utils from '../utils'
import back from '../back'
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

    const closeApp = useCallback(() => {
        if (utils.isTv()) {
            window.close()
        }
    }, [])

    useEffect(() => {
        const loadData = async () => {
            let initPath
            if (await api.isNewInstallation()) {
                initPath = '/warning'
            } else if ((new Date()) > await api.getNextContactDate()) {
                initPath = '/contact'
            } else {
                initPath = '/login'
            }
            setInitScreenState(initPath)
            setPath(initPath)
        }
        if (dbInit) {
            loadData()
        }
    }, [dbInit, setPath, setInitScreenState])

    useEffect(() => {
        if (dbInit) {
            back.pushHistory({ doBack: () => setPath('/askClose') })
        }
    }, [dbInit, setPath])

    useEffect(() => {
        const initDB = async () => {
            await api.init()
            api.setCustomFetch(customFetch)
            setDBInit(true)
        }
        initDB()
    }, [setDBInit, customFetch])

    return (
        <ErrorBoundary>
            <div {...rest}>
                <RoutablePanels {...rest} path={path} noCloseButton
                    onApplicationClose={closeApp}>
                    <Route path='init' component={InitialPanel} {...rest} />
                    <Route path='warning' component={WarningPanel} {...rest} />
                    <Route path='login' component={LoginPanel} {...rest} />
                    <Route path='profiles' component={ProfilesPanel} {...rest} >
                        <Route path='edit' component={ProfileEditPanel} {...rest} />
                        <Route path='home' component={HomePanel} {...rest}>
                            <Route path='serie' component={ContentSeriePanel} {...rest} />
                        </Route>
                    </Route>
                    <Route path='contact' component={ContactMePanel} {...rest} />
                    <Route path='askClose' component={ConfirmExitPanel} {...rest} />
                </RoutablePanels>
            </div>
        </ErrorBoundary>
    )
}

const AppLocal = I18nDecorator({
    resources: [{
        resource: options => new Promise(res => {
            const localeInfo = new LocaleInfo(options.locale).getLocale()
            import(`@cospired/i18n-iso-languages/langs/${localeInfo.language}.json`)
                .then(val => options.onLoad(val)).then(res).catch(res)
        }),
        onLoad: res => languages.registerLocale(res)
    }]
}, App)

const AppTheme = MoonstoneDecorator(AppLocal)

export default AppTheme
