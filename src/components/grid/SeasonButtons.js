
import { useCallback, useEffect, useState } from 'react'
import { Cell, Row} from '@enact/ui/Layout'
import Button from '@enact/moonstone/Button'

import PropTypes from 'prop-types'
import $L from '@enact/i18n/$L'

import api from '../../api'


/**
 * @typedef Season
 * @type {Object}
 * @property {String} id
 * @property {Number} index
 * @property {{title: String, description: String}} localization
 */

/**
 * Show Prev and Next season buttons
 * @param {{
    profile: Object,
    contentKey: String,
    season: Season,
    setSeason: Function,
    setDelay: Function,
 }}
 */
const SeasonButtons = ({ profile, contentKey, season, setSeason, setDelay, ...rest }) => {

    /** @type {[Array<Season>, Function]} */
    const [seasons, setSeasons] = useState(undefined)


    const prevSeason = useCallback(() => {
        setSeason(seasons[season.index + 1])
        setDelay(0)
    }, [season, seasons, setSeason, setDelay])

    const nextSeason = useCallback(() => {
        setSeason(seasons[season.index - 1])
        setDelay(0)
    }, [season, seasons, setSeason, setDelay])


    useEffect(() => {  // initial request
        if (contentKey === 'simulcast') {
            api.discover.getSeasonList(profile).then(({ data: seasonsList }) => {
                seasonsList.forEach((item, index) => { item.index = index })
                setSeasons(seasonsList)
                setSeason(seasonsList[0])
                setDelay(0)
            })
        }
        return () => {
            setSeasons([])
            setSeason(undefined)
        }
    }, [profile, setSeason, contentKey, setDelay])

    return (
        <Cell shrink {...rest}>
            <Row align='start space-between'>
                {season && season.index + 1 < seasons.length &&
                    <Button onClick={prevSeason}>{$L('Prev Season')}</Button>
                }
                {season && season.index - 1 >= 0 &&
                    <Button onClick={nextSeason}>{$L('Next Season')}</Button>
                }
            </Row>
        </Cell>
    )
}

SeasonButtons.propTypes = {
    profile: PropTypes.object.isRequired,
    contentKey: PropTypes.string.isRequired,
    season: PropTypes.object,
    setSeason: PropTypes.func.isRequired,
    setDelay: PropTypes.func.isRequired,
}

export default SeasonButtons
