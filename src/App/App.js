
import { useEffect, useState } from 'react'
import MoonstoneDecorator from '@enact/moonstone/MoonstoneDecorator'
import { Panels, Routable, Route } from '@enact/moonstone/Panels'
import { useRecoilState } from 'recoil'

import InitialPanel from '../views/InitialPanel'
//import HomePanel from '../views/HomePanel'
//import PlayerPanel from '../views/PlayerPanel'
import WarningPanel from '../views/WarningPanel'
import LoginPanel from '../views/LoginPanel'
import ContactMePanel from '../views/ContactMePanel'
import ProfilesPanel from '../views/ProfilesPanel'
import { pathState } from '../recoilConfig'
import api from '../api'
//import logger from '../logger'
import '../back'
import './attachErrorHandler'


const RoutablePanels = Routable({ navigate: 'onBack' }, Panels)

const App = ({ ...rest }) => {
    /** @type {[String, Function]} */
    const [dbInit, setDBInit] = useState(false)
    /** @type {[String, Function]} */
    const [path, setPath] = useRecoilState(pathState)

    useEffect(() => {
        const loadData = async () => {
            if (await api.isNewInstallation()) {
                setPath('/warning')
            } else if ((new Date()) > await api.getNextContactDate()) {
                setPath('/contact')
            } else {
                setPath('/login')
            }
        }
        if (dbInit) {
            loadData()
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
        <RoutablePanels {...rest} path={path} noCloseButton>
            <Route path='init' component={InitialPanel} {...rest} />
            <Route path='warning' component={WarningPanel} {...rest} />
            <Route path='login' component={LoginPanel} {...rest} />
            <Route path='profiles' component={ProfilesPanel} {...rest} />
            <Route path='contact' component={ContactMePanel} {...rest} />
        </RoutablePanels>
    )
}

const AppLocal = App

const AppTheme = MoonstoneDecorator(AppLocal)

export default AppTheme
