
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'

import PropTypes from 'prop-types'

import { useBackVideoIndex } from '../../hooks/backVideoIndex'
import { useViewBackup } from '../../hooks/viewBackup'
import { ContentHeader } from '../home/ContentBanner'
import SeasonsList from './SeasonsList'
import EpisodesList from './EpisodesList'
import api from '../../api'
import { getIsPremium } from '../../utils'


/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {{content: Object, setContent: Function}} obj.contentState
 * @param {Boolean} obj.isPremium account is premium?
 */
const Movies = ({ profile, contentState, isPremium, ...rest }) => {
    const { content: movieListing, setContent: setMovieListing } = contentState
    const { viewBackup, viewBackupRef } = useViewBackup(`content-movies-${movieListing.id}`)
    /** @type {[Array<Object>, Function]} */
    const [listings, setListings] = useState(null)
    /** @type {[Number, Function]} */
    const [listingIndex, setListingIndex] = useState(viewBackup?.listingIndex)
    /** @type {[Array<Object>, Function]} */
    const [movies, setMovies] = useState(null)
    /** @type {[Number, Function]} */
    const [movieIndex, setMovieIndex] = useState(null)
    /** @type {{current: Number}} */
    const listingIndexRef = useRef(null)
    /** @type {String} */
    const cacheKey = useMemo(() => (
        listings && listingIndex != null ? `listings/${listings[listingIndex].id}/movies` : null
    ), [listings, listingIndex])

    /** @type {Function} */
    const setContent = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const index = parseInt(target.dataset.index)
        if (movies && movies.length) {
            /** backup all state to restore later */
            viewBackupRef.current = { listingIndex }
            setMovieListing(movies[index])
        }
    }, [listingIndex, movies, setMovieListing, viewBackupRef])

    useBackVideoIndex(movies, setMovieIndex)

    useEffect(() => {
        listingIndexRef.current = listingIndex
        setMovies(null)  // for activate loading
        setMovieIndex(null)  // for activate loading
        if (listingIndex != null && listings != null) {
            const loadMovies = async () => {
                const cacheMovies = await api.utils.getCustomCache(cacheKey)

                if (cacheMovies) {
                    setMovies(cacheMovies)
                } else {
                    const { data: movieData } = await api.cms.getMovies(
                        profile, { movieListingId: listings[listingIndex].id }
                    )

                    movieData.forEach(ep => {
                        ep.type = 'movie'
                        ep.showPremium = !isPremium && getIsPremium(ep)
                    })

                    if (movieData.length) {
                        await api.content.calculatePlayheadProgress({ profile, episodesData: movieData })
                    }
                    await api.utils.saveCustomCache(cacheKey, movieData)
                    if (listingIndex === listingIndexRef.current) {
                        setMovies(movieData)
                    }
                }
            }
            loadMovies()
        }
    }, [profile, listings, listingIndex, isPremium, cacheKey])

    useEffect(() => {
        const listingsTmp = [{ ...movieListing }]
        setListings(listingsTmp)
        setListingIndex(lastIndex => {
            if (lastIndex == null) {
                lastIndex = listingsTmp.length ? 0 : null
            } else {
                lastIndex = Math.min(lastIndex, listingsTmp.length)
            }
            return lastIndex
        })
    }, [profile, movieListing])

    return (
        <Row align='start space-between' {...rest}>
            <Cell size="49%" style={{ height: '100%', width: '49%' }}>
                <Column>
                    <Cell shrink>
                        <ContentHeader content={movieListing} />
                    </Cell>
                    <Cell>
                        <SeasonsList
                            seasons={listings}
                            selectSeason={setListingIndex}
                            seasonIndex={listingIndex} />
                    </Cell>
                </Column>
            </Cell>
            <Cell size="49%" style={{ height: '100%', width: '49%' }}>
                <EpisodesList
                    key={listings?.[listingIndex]?.id ? `movies-${listings[listingIndex].id}` : undefined}
                    episodes={movies}
                    episodeIndex={movieIndex}
                    selectEpisode={setContent} />
            </Cell>
        </Row>
    )
}

Movies.propTypes = {
    profile: PropTypes.object.isRequired,
    contentState: PropTypes.shape({
        content: PropTypes.object.isRequired,
        setContent: PropTypes.func.isRequired,
    }).isRequired,
    isPremium: PropTypes.bool.isRequired,
}

export default Movies
