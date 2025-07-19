
import { useCallback } from 'react'
import PropTypes from 'prop-types'

import api from '../../api'
import ContentListPoster from '../ContentListPoster'

/**
 * SimilarList
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile current profile
 * @param {{content: Object, setContent: Function}} obj.contentState
 1* @param {Function} obj.onLoadData
 */
const SimilarList = ({ profile, contentState, onLoadData }) => {
    const { content, setContent } = contentState
    /** @type {Function} */
    const loadSimilar = useCallback(async options => {
        const similar = await api.discover.getSimilar(profile, {
            ...options,
            contentId: content.id,
            ratings: true
        })
        onLoadData({ total: similar.total })
        return similar
    }, [profile, content, onLoadData])

    return (
        <ContentListPoster
            profile={profile}
            loadData={loadSimilar}
            onSelect={setContent}
            type={`similar-${content.id}`}
            noPoster
        />
    )
}

SimilarList.propTypes = {
    profile: PropTypes.object.isRequired,
    contentState: PropTypes.shape({
        content: PropTypes.object.isRequired,
        setContent: PropTypes.func.isRequired,
    }).isRequired,
    onLoadData: PropTypes.func.isRequired,
}

export default SimilarList
