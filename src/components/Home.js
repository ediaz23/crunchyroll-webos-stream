
import { ActivityPanels } from '@enact/moonstone/Panels'

import HomeFeed from "./HomeFeed"


const Home = ({ currentActivity }) => {
    return (
        <ActivityPanels index={currentActivity} noCloseButton>
            <HomeFeed />
        </ActivityPanels>
    )
}

export default Home