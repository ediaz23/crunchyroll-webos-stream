
import { useEffect, useState, useCallback } from 'react'
import MoonstoneDecorator from '@enact/moonstone/MoonstoneDecorator'
import { Panels, Routable, Route } from '@enact/moonstone/Panels'
import { useRecoilState, useSetRecoilState } from 'recoil'

import InitialPanel from '../views/InitialPanel'
//import HomePanel from '../views/HomePanel'
//import PlayerPanel from '../views/PlayerPanel'
import WarningPanel from '../views/WarningPanel'
import LoginPanel from '../views/LoginPanel'
import ContactMePanel from '../views/ContactMePanel'
import ProfilesPanel from '../views/ProfilesPanel'
import ConfirmExitPanel from '../views/ConfirnExitPanel'
import { pathState, initScreenState } from '../recoilConfig'
import api from '../api'
//import logger from '../logger'
import utils from '../utils'
import back from '../back'
import './attachErrorHandler'


const RoutablePanels = Routable({ navigate: 'onBack' }, Panels)

const App = ({ ...rest }) => {
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
            setDBInit(true)
        }
        initDB()
    }, [setDBInit])

    return (
        <div {...rest}>
            <RoutablePanels {...rest} path={path} noCloseButton
                onApplicationClose={closeApp}>
                <Route path='init' component={InitialPanel} {...rest} />
                <Route path='warning' component={WarningPanel} {...rest} />
                <Route path='login' component={LoginPanel} {...rest} />
                <Route path='profiles' component={ProfilesPanel} {...rest} />
                <Route path='contact' component={ContactMePanel} {...rest} />
                <Route path='askClose' component={ConfirmExitPanel} {...rest} />
            </RoutablePanels>
        </div>
    )
}

const AppLocal = App

const AppTheme = MoonstoneDecorator(AppLocal)

export default AppTheme
