import { useCallback } from 'react'
import Button from '@enact/moonstone/Button'
import { Panel, Header } from '@enact/moonstone/Panels'
//import { useSetRecoilState } from 'recoil'

//import { pathState } from '../recoilConfig'
//import api from '../api'

const ProfilesPanel = (props) => {
    /** @type {Function} */
    //    const setPath = useSetRecoilState(pathState)

    const accept = useCallback(async () => {
        console.log('click')
        //        setPath('/contact')
        //        await api.setInstalled()
    }, [])

    return (
        <Panel {...props}>
            <Header title="Profiles" />
            <Button onClick={accept}>Click me</Button>
        </Panel>
    )
}

export default ProfilesPanel
