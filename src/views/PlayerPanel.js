
import Cancelable from '@enact/ui/Cancelable'
import Player from '../components/player/Player'
import back from '../back'


const PlayerPanelBase = ({...rest}) => {
    delete rest.hideChildren
    return (
        <Player {...rest} />
    )
}

const handleCancel = (ev) => {
    ev.stopPropagation()
    back.doBack()
}

const PlayerPanel = Cancelable(
    { modal: true, onCancel: handleCancel },
    PlayerPanelBase
)

export default PlayerPanel
