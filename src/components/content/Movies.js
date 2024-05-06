
import { useState, useEffect, useCallback } from 'react'
import { Row, Cell } from '@enact/ui/Layout'

import PropTypes from 'prop-types'

import { ContentHeader } from '../home/ContentBanner'
import SeasonsList from './SeasonsList'
import EpisodesList from './EpisodesList'
import { calculatePlayheadProgress } from './Seasons'
import api from '../../api'


/**
 * @param {{
    profile: import('crunchyroll-js-api').Types.Profile,
    movieListing: Object,
    setContentToPlay: Function,
 }}
 */
const Movies = ({ profile, movieListing, setContentToPlay, ...rest }) => {
    /** @type {[Array<Object>, Function]} */
    const [listings, setListings] = useState([])
    /** @type {[Object, Function]} */
    const [listing, setListing] = useState({})
    /** @type {[Array<Object>, Function]} */
    const [movies, setMovies] = useState([])

    /** @type {Function} */
    const selectListing = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        setListing(listings[parseInt(target.dataset.index)])
    }, [listings, setListing])

    const playMovie = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        setContentToPlay(movies[parseInt(target.dataset.index)])
    }, [movies, setContentToPlay])

    useEffect(() => {
        const listingsTmp = [{ ...movieListing, movies: [] }]
        setListings(listingsTmp)
        setListing(listingsTmp[0])
    }, [profile, movieListing, setListings])

    useEffect(() => {
        const loadData = async () => {
            if (listing.movies.length) {
                setMovies(listing.movies)
            } else {
                const { data: moviesData } = await api.cms.getMovies(profile, { movieListingId: listing.id })
                await calculatePlayheadProgress({ profile, episodesData: moviesData })
                moviesData.forEach(ep => { ep.type = 'movie' })
                listing.movies = moviesData
                setMovies(moviesData)
            }
        }
        if (listing.id) {
            loadData()
        }
    }, [profile, listing])

    return (
        <Row align='start space-between' {...rest}>
            <Cell size="49%">
                <ContentHeader content={movieListing} />
                <SeasonsList seasons={listings} selectSeason={selectListing} />
            </Cell>
            <Cell size="49%">
                <EpisodesList episodes={movies} selectEpisode={playMovie} />
            </Cell>
        </Row>
    )
}

Movies.propTypes = {
    profile: PropTypes.object.isRequired,
    movieListing: PropTypes.object.isRequired,
    setContentToPlay: PropTypes.func.isRequired,
}

export default Movies