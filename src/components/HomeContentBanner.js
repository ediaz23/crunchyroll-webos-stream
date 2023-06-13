
import { useRef, useEffect, useState } from 'react';
import { Row, Cell } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import BodyText from '@enact/moonstone/BodyText'
import Image from '@enact/moonstone/Image'

import PropTypes from 'prop-types'

import css from './HomeContentBanner.module.less'


const HomeContentBanner = ({ content }) => {
    /** @type {[{source: String, size: {width: Number, height: Number}}, Function]} */
    const [image, setImage] = useState({ source: null, size: {} })
    const compRef = useRef(null)

    useEffect(() => {
        if (compRef && compRef.current) {
            const boundingRect = compRef.current.getBoundingClientRect();
            const { width, height } = boundingRect
            /** @type {Array<{width: Number, height: Number, source: String}>} */
            let images = []
            if (content.images.poster_wide) {
                images = content.images.poster_wide
            } else if (content.images.poster_tall) {
                images = content.images.poster_tall
            } else if (content.images.thumbnail) {
                images = content.images.thumbnail
            } else {
                throw new Error('Image not handle')
            }
            images = Array.isArray(images[0]) ? images[0] : images
            let newImage = images[0]
            for (const image of images) {
                if (image.width >= width || image.height >= height) {
                    break
                }
                newImage = image
            }
            setImage({
                source: newImage.source,
                size: {
                    height: `${Math.min(height, newImage.height)}px`,
                    width: `${Math.min(width, newImage.width)}px`,
                }
            })
        }
    }, [compRef, content])

    return (
        <Row className={css.homeContentBanner} >
            <Cell size="50%">
                <Heading size="large">
                    {content.title}
                </Heading>
                <BodyText size='small'>
                    {content.description}
                </BodyText>
            </Cell>
            <Cell ref={compRef}>
                {image.source &&
                    <Image className={css.poster} src={image.source}
                        sizing='none' style={image.size} />
                }
            </Cell>
        </Row>
    )
}

HomeContentBanner.propTypes = {
    content: PropTypes.object.isRequired,
}

export default HomeContentBanner
