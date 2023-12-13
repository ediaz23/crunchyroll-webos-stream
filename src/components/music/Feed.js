
import PropTypes from 'prop-types'


const MusicFeed = ({ profile, musicfeed }) => {
    return (<div>music</div>)
}

MusicFeed.propTypes = {
    profile: PropTypes.object.isRequired,
    musicfeed: PropTypes.arrayOf(PropTypes.object).isRequired,
}

export default MusicFeed

