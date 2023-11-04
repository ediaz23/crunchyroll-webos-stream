
import { useCallback, useState, useEffect, useMemo } from 'react'
import IconButton from '@enact/moonstone/IconButton'
import PropTypes from 'prop-types'

import api from '../../api'
import css from '../Share.module.less'


/**
 * @param {{
    profile: import('crunchyroll-js-api/src/types').Profile,
    content: Object,
 }}
 */
const Rating = ({ profile, content, ...rest }) => {
    /** @type {[String, setRating]} */
    const [rating, setRating] = useState('')
    /** @type {Object} */
    const shortContent = useMemo(() => {
        return { contentId: content.id, contentType: content.type }
    }, [content])
    /** @type {Function} */
    const doRating = useCallback(ev => {
        /** @type {{target: HTMLElement}} */
        const { target } = ev
        const newRating = target.parentElement.getAttribute('id')
        if (rating === newRating) {
            api.review.removeRating(profile, shortContent)
                .then(() => setRating(''))
        } else {
            api.review.updateEpisodeRating(profile, { ...shortContent, rating: newRating })
                .then(() => setRating(newRating))
        }
    }, [profile, shortContent, setRating, rating])

    useEffect(() => {
        api.review.getRatings(profile, shortContent).then(data => {
            if (data && data.rating) {
                setRating(data.rating)
            }
        })
    }, [profile, shortContent, setRating])

    return (
        <>
            <IconButton backgroundOpacity="lightTranslucent"
                id='down'
                selected={rating === 'down'}
                onClick={doRating}
                css={{ iconButton: css.IconCustomColor }}
                {...rest}>
                &#x1F44E;
            </IconButton>
            <IconButton backgroundOpacity="lightTranslucent"
                id='up'
                selected={rating === 'up'}
                onClick={doRating}
                css={{ iconButton: css.IconCustomColor }}
                {...rest}>
                &#x1F44D;
            </IconButton>
        </>
    )
}

Rating.propTypes = {
    profile: PropTypes.object.isRequired,
    content: PropTypes.object.isRequired,
}

export default Rating
