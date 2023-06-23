
import ri from '@enact/ui/resolution'
//import VirtualList from '@enact/moonstone/VirtualList'
import VirtualListNested from '../patch/VirtualListNested'
//import { VirtualGridList } from '@enact/moonstone/VirtualList'
//import GridListImageItem from '@enact/moonstone/GridListImageItem'
import Heading from '@enact/moonstone/Heading'
import Image from '@enact/moonstone/Image'

import useGetImagePerResolution from '../hooks/getImagePerResolution'
import Navigable from '../wrappers/Navigable'


const NavigableDiv = Navigable('div', '')


const Poster = ({ title, image, itemSize, ...rest }) => {
    rest.style.width = itemSize
    return (
        <NavigableDiv {...rest}>
            <Image src={image.source}
                sizing='none' style={image.size} />
            <Heading size="small">
                {title}
            </Heading>
        </NavigableDiv >
    )
}

const HomeFeedItem = ({ feed, index, ...rest }) => {
    const feedItem = feed.items[index]
    const getImagePerResolution = useGetImagePerResolution()
    const image = getImagePerResolution({ height: 100, width: 300, content: feedItem })
    return (
        <Poster
            title={feedItem.title}
            image={image}
            {...rest}
        />
    )
}

const HomeFeedRow = ({ feed, itemSize, cellId, ...rest }) => {
    rest.style.height = itemSize
    return (
        <div {...rest} >
            <Heading size="title" spacing="small">
                {feed.title}
            </Heading>
            <VirtualListNested
                dataSize={feed.items.length}
                itemRenderer={HomeFeedItem}
                itemSize={ri.scale(320)}
                childProps={{ id: cellId, feed, itemSize: ri.scale(320) }}
                direction='horizontal'
                verticalScrollbar='hidden'
                horizontalScrollbar='hidden'
                noScrollByWheel
            />
        </div>
    )
}

export default HomeFeedRow
