
import { useState, useEffect, useCallback } from 'react'
import { Row, Cell, Column } from '@enact/ui/Layout'

import PropTypes from 'prop-types'

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
 * @param {Function} obj.onSelectSeason
 */
const Movies = ({ profile, movieListing, setContentToPlay, isPremium, contentDetailBak, onSelectSeason, ...rest }) => {
    /** @type {[Array<Object>, Function]} */
    const [listings, setListings] = useState(JSON.parse(JSON.stringify(contentDetailBak.listings || [])))
    /** @type {[Number, Function]} */
    const [listingIndex, setListingIndex] = useState(contentDetailBak.listingIndex || 0)
    /** @type {[Array<Object>, Function]} */
    const [movies, setMovies] = useState(contentDetailBak.movies || [])

    /** @type {Function} */
    const selectListing = useCallback(index => {
        // reset bak values
        onSelectSeason({ movieIndex: undefined })
        setListingIndex(index)
    }, [onSelectSeason])

    /** @type {Function} */
    const playMovie = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const movieIndex = parseInt(target.dataset.index)
        listings.forEach(e => { e.movies = [] })
        setContentToPlay(movies[movieIndex], {
            listings,
            listingIndex,
            movieIndex,
        })
    }, [listings, listingIndex, movies, setContentToPlay])

    useEffect(() => {
        if (contentDetailBak.listings == null) {
            const listingsTmp = [{ ...movieListing, movies: [] }]
            setListings(listingsTmp)
        }
    }, [profile, movieListing, setListings, contentDetailBak.listings])

    useEffect(() => {
        const loadData = () => {
            if (listings[listingIndex].movies.length) {
                setMovies(listings[listingIndex].movies)
            } else {
                api.cms.getMovies(profile, { movieListingId: listings[listingIndex].id })
                    .then(({ data }) => Promise.all([
                        Promise.resolve().then(() => {
                            data.forEach(ep => {
                                ep.type = 'movie'
                                ep.showPremium = !isPremium && getIsPremium(ep)
                            })
                            listings[listingIndex].movies = data
                        }),
                        calculatePlayheadProgress({ profile, episodesData: data }),
                    ]).then(() => setMovies(data)))
            }
        }
        if (listings.length && contentDetailBak.movies == null) {
            loadData()
        }
    }, [profile, listings, listingIndex, isPremium, contentDetailBak.movies])

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
                            selectSeason={selectListing}
                            seasonIndex={listingIndex} />
                    </Cell>
                </Column>
            </Cell>
            <Cell size="49%">
                <EpisodesList
                    seasonIndex={listingIndex}
                    episodes={movies}
                    selectEpisode={playMovie}
                    episodeIndex={contentDetailBak.movieIndex} />
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
    onSelectSeason: PropTypes.func.isRequired,
}

export default Movies