
import { useMemo } from 'react'
import RadioItem from '@enact/moonstone/RadioItem'
import Group from '@enact/ui/Group'
import ri from '@enact/ui/resolution'
import PropTypes from 'prop-types'

import Scroller from '../../patch/Scroller'


/**
 * @typedef Subtitle
 * @type {Object}
 * @property {String} url
 * @property {String} format
 * @property {String} locale
 * @property {String} title
 */
/**
 * @param {Object} obj
 * @param {Array<Subtitle>} obj.subtitles
 * @param {Subtitle} obj.subtitle
 * @param {Function} obj.onSelectSubtitle
 */
const SubtitleList = ({ subtitles, subtitle, onSelectSubtitle, ...rest }) => {

    const subtitleList = useMemo(() => subtitles.map(a => {
        return { key: a.locale, children: a.title }
    }), [subtitles])
    const selectedSubtitle = subtitleList.findIndex(val => subtitle && val.key === subtitle.locale)

    return (
        <Scroller direction='vertical'
            horizontalScrollbar='hidden'
            verticalScrollbar='visible'
            focusableScrollbar>
            <div style={{ maxHeight: ri.scale(400) }}>
                <Group
                    childComponent={RadioItem}
                    defaultSelected={selectedSubtitle}
                    onSelect={onSelectSubtitle}
                    select="radio"
                    selectedProp="selected"
                    {...rest}>
                    {subtitleList}
                </Group>
            </div>
        </Scroller>
    )
}

SubtitleList.propTypes = {
    subtitles: PropTypes.arrayOf(PropTypes.object).isRequired,
    subtitle: PropTypes.object,
    onSelectSubtitle: PropTypes.func.isRequired,
}

export default SubtitleList
