import { useEffect } from 'react'
import { Panel, Header } from '@enact/moonstone/Panels'

import { useRecoilValue } from 'recoil'

import { currentProfileState } from '../recoilConfig'
import api from '../api'


const EditProfilePanel = (props) => {

    /** @type {import('crunchyroll-js-api/src/types').Profile, Function}*/
    const profile = useRecoilValue(currentProfileState)

    useEffect(() => {
        const loadData = async () => {
            console.log(await api.getHome(profile))
        }
        loadData()
    }, [profile])


    return (
        <Panel {...props}>
            <Header title="Home" />
        </Panel>
    )
}

export default EditProfilePanel
