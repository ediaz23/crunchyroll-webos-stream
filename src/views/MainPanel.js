import Button from '@enact/moonstone/Button'
import { Panel, Header } from '@enact/moonstone/Panels'

import api from '../api'

function onClick() {
    api.setCredentials({ username: 'ediaz', password: '111' })
}

const MainPanel = (props) => {
    return (
        <Panel {...props}>
            <Header title="Hello world!" />
            <Button onClick={onClick}>Click me</Button>
        </Panel>
    )
}

export default MainPanel
