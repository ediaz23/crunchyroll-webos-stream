
import { useState, useEffect, useCallback, useRef } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'

import PropTypes from 'prop-types'

import { useBackVideoIndex } from '../../hooks/backVideoIndex'
import { ContentHeader } from '../home/ContentBanner'
import SeasonsList from './SeasonsList'
import EpisodesList from './EpisodesList'
import { calculatePlayheadProgress } from './Seasons'
import api from '../../api'
import { getIsPremium } from '../../utils'


/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.movieListing
 * @param {Function} obj.setContentToPlay
 * @param {Boolean} obj.isPremium account is premium?
 * @param {Object} obj.contentDetailBak
 */
const Movies = ({ profile, movieListing, setContentToPlay, isPremium, contentDetailBak, ...rest }) => {
    /** @type {[Array<Object>, Function]} */
    const [listings, setListings] = useState(contentDetailBak.listings
        ? JSON.parse(JSON.stringify(contentDetailBak.listings))  // to avoid error setting movies, line 74
        : null
    )
    /** @type {[Number, Function]} */
    const [listingIndex, setListingIndex] = useState(contentDetailBak.listingIndex)
    /** @type {[Array<Object>, Function]} */
    const [movies, setMovies] = useState(null)
    /** @type {[Number, Function]} */
    const [movieIndex, setMovieIndex] = useState(null)
    /** @type {{current: Number}} */
    const listingIndexRef = useRef(null)

    /** @type {Function} */
    const playMovie = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const index = parseInt(target.dataset.index)
        if (movies && movies.length) {
            listings.forEach(e => { e.movies = [] })
            setContentToPlay(movies[index], { listings, listingIndex })
        }
    }, [listings, listingIndex, movies, setContentToPlay])

    useBackVideoIndex(movies, setMovieIndex)

    useEffect(() => {
        if (contentDetailBak.listings == null) {
            const listingsTmp = [{ ...movieListing, movies: [] }]
            setListings(listingsTmp)
            setListingIndex(0)
        }
    }, [profile, movieListing, setListings, contentDetailBak.listings])

    useEffect(() => {
        listingIndexRef.current = listingIndex
        setMovies(null)
        setMovieIndex(null)
        if (listingIndex != null && listings != null) {
            if (listings[listingIndex].movies.length) {
                setMovies(listings[listingIndex].movies)
            } else {
                api.cms.getMovies(profile, { movieListingId: listings[listingIndex].id }).then(async ({ data }) => {
                    data.forEach(ep => {
                        ep.type = 'movie'
                        ep.showPremium = !isPremium && getIsPremium(ep)
                    })

                    listings[listingIndex].movies = data

                    if (data.length) {
                        await calculatePlayheadProgress({ profile, episodesData: data })
                    }

                    if (listingIndex === listingIndexRef.current) {
                        setMovies(data)
                    }
                })
            }
        }
    }, [profile, listings, listingIndex, isPremium])

    return (
        <Row align='start space-between' {...rest}>
            <Cell size="49%">
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
            <Cell size="49%">
                <EpisodesList
                    seasonIndex={listingIndex}
                    episodes={movies}
                    selectEpisode={playMovie}
                    episodeIndex={movieIndex} />
            </Cell>
        </Row>
    )
}

Movies.propTypes = {
    profile: PropTypes.object.isRequired,
    movieListing: PropTypes.object.isRequired,
    setContentToPlay: PropTypes.func.isRequired,
    isPremium: PropTypes.bool.isRequired,
    contentDetailBak: PropTypes.object.isRequired,
}

export default Movies