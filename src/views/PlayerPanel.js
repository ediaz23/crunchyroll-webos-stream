
import Cancelable from '@enact/ui/Cancelable'
import PropTypes from 'prop-types'
import Player from '../components/player/Player'
import back from '../back'


const PlayerPanelBase = ({...rest}) => {
    delete rest.hideChildren
    return (
        <Player {...rest} />
    )
}

Player.propTypes = {
    backHome: PropTypes.func,
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
