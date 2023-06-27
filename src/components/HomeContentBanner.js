
import { useRef, useEffect, useState } from 'react';
import { Row, Cell } from '@enact/ui/Layout'
import Heading from '@enact/moonstone/Heading'
import BodyText from '@enact/moonstone/BodyText'
import Image from '@enact/moonstone/Image'

import PropTypes from 'prop-types'

import useGetImagePerResolution from '../hooks/getImagePerResolution'
import css from './HomeContentBanner.module.less'


const HomeContentBanner = ({ content }) => {
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {[{source: String, size: {width: Number, height: Number}}, Function]} */
    const [image, setImage] = useState(getImagePerResolution({}))
    /** @type {{current: HTMLElement}} */
    const compRef = useRef(null)

    useEffect(() => {
        if (compRef && compRef.current) {
            const boundingRect = compRef.current.getBoundingClientRect();
            setImage(getImagePerResolution({ height: boundingRect.height, width: boundingRect.width, content }))
        }
    }, [compRef, content, getImagePerResolution])

    return (
        <Row className={css.homeContentBanner} >
            <Cell size="50%">
                <Heading size="large">
                    {content.title}
                </Heading>
                <BodyText size='small' component='div'>
                    {content.description}
                </BodyText>
            </Cell>
            <Cell ref={compRef}>
                {image.source &&
                    <Image className={css.poster} src={image.source}
                        sizing='fill' style={{ width: '100%', height: '100%' }} />
                }
            </Cell>
        </Row>
    )
}

HomeContentBanner.propTypes = {
    content: PropTypes.object.isRequired,
}

export default HomeContentBanner
