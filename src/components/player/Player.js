
import dashjs from 'dashjs'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import VideoPlayer, { MediaControls, Video } from '@enact/moonstone/VideoPlayer'
import { useRecoilValue, useRecoilState } from 'recoil'
import SubtitlesOctopus from 'libass-wasm'

import AudioSelect from './AudioSelect'
import SubtitleSelect from './SubtitleSelect'
import Rating from './Rating'
import ContentInfo from './ContentInfo'
import ContactMe from '../login/ContactMe'
import { currentProfileState, playContentState } from '../../recoilConfig'
import { useGetLanguage } from '../../hooks/language'
import logger from '../../logger'
import api from '../../api'
import { getContentParam } from '../../api/utils'
import emptyVideo from '../../../resources/empty.mp4'
import back from '../../back'
import useCustomFetch from '../../hooks/customFetch'
import { getUserAgent } from 'crunchyroll-js-api/src/const'


/**
 * @typedef StreamSession
 * @type {Object}
 * @property {Number} renewSeconds
 * @property {Number} noNetworkRetryIntervalSeconds
 * @property {Number} noNetworkTimeoutSeconds
 * @property {Number} maximumPauseSeconds
 * @property {Number} endOfVideoUnloadSeconds
 * @property {Number} sessionExpirationSeconds
 * @property {Boolean} usesStreamLimits
 */

/**
 * @typedef Stream
 * @type {Object}
 * @property {String} url
 * @property {String} bif
 * @property {String} token
 * @property {StreamSession} session
 * @property {Array<import('./AudioList').Audio>} audios
 * @property {Array<import('./SubtitleList').Subtitle>} subtitles
 */

/**
 * @param {{
    profile: import('crunchyroll-js-api/src/types').Profile,
    content: Object,
    videoCompRef: {current:import('@enact/moonstone/VideoPlayer/VideoPlayer').VideoPlayerBase}
 }}
 @returns {Promise}
 */
const updatePlayHead = async ({ profile, content, videoCompRef }) => {
    if (['episode', 'movie'].includes(content.type)) {
        /** @type {{paused: boolean, currentTime: number}} */
        const state = videoCompRef.current.getMediaState()
        content.playhead.playhead = Math.floor(state.currentTime)
        return api.content.savePlayhead(profile, {
            contentId: content.id,
            playhead: Math.floor(state.currentTime),
        })
    }
}

/**
 * @param {{
    profile: import('crunchyroll-js-api/src/types').Profile,
    content: Object,
    videoCompRef: {current:import('@enact/moonstone/VideoPlayer/VideoPlayer').VideoPlayerBase}
 }}
 * @returns {Function}
 */
const updatePlayHeadLoop = ({ profile, content, videoCompRef }) => {
    const interval = setInterval(() => {
        if (videoCompRef.current) {
            /** @type {{paused: boolean, currentTime: number}} */
            const state = videoCompRef.current.getMediaState()
            if (!state.paused) {
                updatePlayHead({ profile, content, videoCompRef }).catch(logger.error)
            }
        }
    }, 1000 * 15) // every 15 sec
    return () => clearInterval(interval)
}

/**
 * @param {{
    profile: import('crunchyroll-js-api/src/types').Profile,
    content: Object,
 }}
 * @returns {Promise}
 */
const findPlayHead = async ({ profile, content }) => {
    let playhead = {
        playhead: 0,
        fully_watched: false,
    }
    if (['episode', 'movie'].includes(content.type)) {
        const { data } = await api.content.getPlayHeads(profile, { contentIds: [content.id] })
        if (data && data.length > 0) {
            playhead = data[0]
        }
    }
    return playhead
}

/**
 * @param {{
    content: Object,
    getLang: Function,
 }}
 * @returns {Array<import('./AudioList').Audio>}
 */
const searchAudios = ({ content, getLang }) => {
    /** @type {Array<import('./AudioList').Audio} */
    let audios = []
    if (content.versions) {
        audios = content.versions.map(audio => {
            return {
                ...audio,
                title: getLang(audio.audio_locale),
                type: content.type
            }
        })
    } else {
        audios = [{
            title: content.subTitle || content.title,
            type: content.type,
            media_guid: content.id,
            audio_locale: 'none',
        }]
    }
    return audios
}


/**
 * @param {{
    profile: import('crunchyroll-js-api/src/types').Profile,
    audios: Array<import('./AudioList').Audio>
 }}
 * @returns {import('./AudioList').Audio}
 */
const findAudio = ({ profile, audios }) => {
    let audio = audios.find(e => e.audio_locale === profile.preferred_content_audio_language)
    if (!audio) {
        audio = audios.find(e => e.audio_locale === 'ja-JP')
        if (!audio) {
            audio = audios[0]
        }
    }
    return audio
}

/**
 * @param {{
    profile: import('crunchyroll-js-api/src/types').Profile,
    subtitles: Array<import('./SubtitleList').Subtitle>
 }}
 * @returns {import('./SubtitleList').Subtitle}
 */
const findSubtitle = ({ profile, subtitles }) => {
    return subtitles.find(e => e.locale === profile.preferred_content_subtitle_language)
}

/**
 * @fixmi not audio.guid meiji gekken
 * @param {{
    profile: import('crunchyroll-js-api/src/types').Profile,
    audios: Array<import('./AudioList').Audio>,
    audio: import('./AudioList').Audio,
    getLang: Function,
  }}
 * @returns {Promise<Stream>}
 */
const findStream = async ({ profile, audios, audio, getLang }) => {
    let data = {}
    if (['episode', 'movie'].includes(audio.type)) {
        data = await api.drm.getStreams(profile, { episodeId: audio.guid })
    } else if (['musicConcert', 'musicVideo'].includes(audio.type)) {
        data = await api.drm.getStreams(profile, { episodeId: audio.guid, type: 'music' })
    }
    console.log(data)
    /** @type {Stream} */
    const out = {
        url: data.url,
        bif: data.bifs,
        audios: audios,
        session: data.session,
        token: data.token,
        subtitles: [{ language: 'off', }, ...Object.values(data.subtitles)].map(subtitle => {
            return { ...subtitle, locale: subtitle.language, title: getLang(subtitle.language) }
        })
    }

    return out
}

/**
 * @param {{
    bif: String,
    customFetch: Function
  }}
 * @returns {Promise<Array<String>>}
 */
const searchPreviews = async ({ bif, customFetch }) => {
    let images = []
    try {
        /** @type {Response} */
        const res = await customFetch(bif)
        const buf = await res.arrayBuffer()
        const bifData = new Uint8Array(buf)
        const jpegStartMarker = new Uint8Array([0xFF, 0xD8]) // JPEG Init

        let imageStartIndex = -1
        for (let i = 0; i < bifData.length - 1; i++) {
            if (bifData[i] === jpegStartMarker[0] && bifData[i + 1] === jpegStartMarker[1]) {
                if (imageStartIndex !== -1) {
                    const imageData = bifData.subarray(imageStartIndex, i)
                    images.push(imageData)
                }
                imageStartIndex = i
            }
        }
        if (imageStartIndex !== -1) {
            const imageData = bifData.subarray(imageStartIndex)
            images.push(imageData)
        }
        images = images.map(imageData => {
            return URL.createObjectURL(new window.Blob([imageData], { type: 'image/jpeg' }))
        })
    } catch (e) {
        logger.error(e)
    }
    return images
}

/**
 * @param {{
    content: Object,
  }}
 * @returns {String}
 */
const findPoster = ({ content }) => {
    let posterOut = null
    if (content && content.images && content.images.thumbnail) {
        /** @type {Array<{source: String}>} */
        const thumbnail = content.images.thumbnail[0]
        if (thumbnail && thumbnail.length) {
            posterOut = thumbnail[thumbnail.length - 1].source
        }
    }
    return posterOut
}

/**
 * @param {{
    profile: import('crunchyroll-js-api/src/types').Profile,
    content: Object,
    concerts: Array<String>,
    step: Number,
    apiFunction: Function,
 }}
 * @returns {Promise<Object>}
 */
const getNextVideoOrConcert = async ({ profile, content, concerts, step, apiFunction }) => {
    let out = null
    const index = concerts.findIndex(val => val === content.id)
    const nextIndex = index + step
    if (index >= 0 && nextIndex >= 0 && nextIndex < concerts.length) {
        const { data: newConcerts } = await apiFunction(profile, [concerts[nextIndex]])
        if (newConcerts.length > 0) {
            out = newConcerts[0]
        }
    }
    return out
}

/**
 * @param {{
    profile: import('crunchyroll-js-api/src/types').Profile,
    content: Object,
    step: Number,
 }}
 * @returns {Promise<{total: Number, data: Array<Object>}>}
 */
const findNextEp = async ({ profile, content, step }) => {
    let out = null
    if (['episode'].includes(content.type)) {
        if (step > 0) {
            out = await api.discover.getNext(profile, { contentId: content.id })
        } else {
            out = await api.discover.getPrev(profile, { contentId: content.id })
        }
    } else if (['movie'].includes(content.type)) {
        const movies = await api.cms.getMovies(profile, { movieListingId: content.listing_id })
        const movieIndex = movies.data.findIndex(item => item.id === content.id)
        const nextIndex = movieIndex + step
        if (0 <= nextIndex && nextIndex < movies.total) {
            out = { total: 1, data: [movies.data[nextIndex]] }
        }
    } else if (['musicConcert', 'musicVideo'].includes(content.type)) {
        const { data: artists } = await api.music.getArtists(profile, [content.artist.id])
        if (artists.length > 0) {
            const params = { profile, content, step }
            if ('musicConcert' === content.type) {
                out = await getNextVideoOrConcert({
                    ...params,
                    concerts: artists[0].concerts,
                    apiFunction: api.music.getConcerts
                })
            } else if ('musicVideo' === content.type) {
                out = await getNextVideoOrConcert({
                    ...params,
                    concerts: artists[0].videos,
                    apiFunction: api.music.getVideos
                })
            }
            if (out) {
                out = { total: 1, data: [out] }
            }
        }
    }
    if (out && out.total > 0) {
        out.data[0].type = content.type
    }
    return out
}

/**
 * @todo manejar errores
 * @param {{
    subUrl: String,
 }}
 * @returns {import('libass-wasm')}
 */
const createOptapus = ({ subUrl }) => {
    console.log('createOptapus')
    const octopusWorkerUrl = new URL('libass-wasm/dist/js/subtitles-octopus-worker.js', import.meta.url)
    const octopuslegacyWorkerUrl = new URL('libass-wasm/dist/js/subtitles-octopus-worker-legacy.js', import.meta.url)
    const testFont = new URL('../../../resources/default.woff2', import.meta.url)
    const _wasm = new URL('libass-wasm/dist/js/subtitles-octopus-worker.wasm', import.meta.url)
    return new SubtitlesOctopus({
        video: document.querySelector('video'),
        subUrl,
        fonts: [testFont.href],
        workerUrl: octopusWorkerUrl.href,
        legacyWorkerUrl: octopuslegacyWorkerUrl.href,
        onReady: () => {
            console.log('si listo')
        },
        onError: (e) => {
            console.error(e)
        },
        _wasm,
    })
}

const SERVER_CERTIFICATE = 'CrsCCAMSEKDc0WAwLAQT1SB2ogyBJEwYv4Tx7gUi' +
    'jgIwggEKAoIBAQC8Xc/GTRwZDtlnBThq8V382D1oJAM0F/YgCQtNDLz7vTWJ+QskNGi5Dd2qzO4s48Cnx5BLv' +
    'L4H0xCRSw2Ed6ekHSdrRUwyoYOE+M/t1oIbccwlTQ7o+BpV1X6TB7fxFyx1jsBtRsBWphU65w121zqmSiwzZz' +
    'J4xsXVQCJpQnNI61gzHO42XZOMuxytMm0F6puNHTTqhyY3Z290YqvSDdOB+UY5QJuXJgjhvOUD9+oaLlvT+vw' +
    'mV2/NJWxKqHBKdL9JqvOnNiQUF0hDI7Wf8Wb63RYSXKE27Ky31hKgx1wuq7TTWkA+kHnJTUrTEfQxfPR4dJTq' +
    'uE+IDLAi5yeVVxzbAgMBAAE6DGNhc3RsYWJzLmNvbUABEoADMmGXpXg/0qxUuwokpsqVIHZrJfu62ar+BF8UV' +
    'UKdK5oYQoiTZd9OzK3kr29kqGGk3lSgM0/p499p/FUL8oHHzgsJ7Hajdsyzn0Vs3+VysAgaJAkXZ+k+N6Ka0W' +
    'BiZlCtcunVJDiHQbz1sF9GvcePUUi2fM/h7hyskG5ZLAyJMzTvgnV3D8/I5Y6mCFBPb/+/Ri+9bEvquPF3Ff9' +
    'ip3yEHu9mcQeEYCeGe9zR/27eI5MATX39gYtCnn7dDXVxo4/rCYK0A4VemC3HRai2X3pSGcsKY7+6we7h4Iyc' +
    'jqtuGtYg8AbaigovcoURAZcr1d/G0rpREjLdVLG0Gjqk63Gx688W5gh3TKemsK3R1jV0dOfj3e6uV/kTpsNRL' +
    '9KsD0v7ysBQVdUXEbJotcFz71tI5qc3jwr6GjYIPA3VzusD17PN6AGQniMwxJV12z/EgnUopcFB13osydpD2A' +
    'aDsgWo5RWJcNf+fzCgtUQx/0Au9+xVm5LQBdv8Ja4f2oiHN3dw'

const CRUNCHYROLL_SAL_S1E1_PSSH = "AAAAoXBzc2gAAAAA7e+LqXnWSs6jyCfc1R0h7QAAAIEIARIQmYVDQW4gNdatYCGbY/l5jRoIY2FzdGxhYnMiWGV5SmhjM05sZEVsa0lqb2lZelJqTlRnNE1UUmpORFEwTWpGaVpqRmlObUprTXpka01USm1NVFppWmpjaUxDSjJZWEpwWVc1MFNXUWlPaUpoZG10bGVTSjkyB2RlZmF1bHQ="

/**
 * @todo chagen subs and audio is not working well
 * @todo cambiar subs y audios
 */
const Player = ({ ...rest }) => {
    /** @type {Function} */
    const customFetch = useCustomFetch()
    /** @type {Function} */
    const getLang = useGetLanguage()
    /** @type {import('crunchyroll-js-api/src/types').Profile}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {[Object, Function]} */
    const [playContent, setPlayContent] = useRecoilState(playContentState)
    /** @type {Object} */
    const content = useMemo(() => {
        return Object.assign({}, playContent, playContent.episode_metadata || {})
    }, [playContent])
    /** @type {Array<import('./AudioList').Audio} */
    const audios = useMemo(() => searchAudios({ content, getLang }), [content, getLang])
    const poster = useMemo(() => findPoster({ content }), [content])
    /** @type {[import('./AudioList').Audio, Function]} */
    const [audio, setAudio] = useState({})
    /** @type {[import('./SubtitleList').Subtitle, Function]} */
    const [subtitle, setSubtitle] = useState({})
    /** @type {[Boolean, Function]} */
    const [loading, setLoading] = useState(true)
    /** @type {[Array<String>, Function]} */
    const [previews, setPreviews] = useState([])
    /** @type {[String, Function]} */
    const [preview, setPreview] = useState({})
    /** @type {{current:import('@enact/moonstone/VideoPlayer/VideoPlayer').VideoPlayerBase}} */
    const videoCompRef = useRef(null)
    /** @type {{current: import('dashjs').MediaPlayerClass}*/
    const playerRef = useRef(null)
    /** @type {{current: import('libass-wasm')}*/
    const octopusRes = useRef(null)
    const emptyStream = useMemo(() => {
        return { url: null, bif: null, audios: [], subtitles: [] }
    }, [])
    /** @type {[Stream, Function]} */
    const [stream, setStream] = useState(emptyStream)

    /** @type {Function} */
    const selectAudio = useCallback((select) => {
        videoCompRef.current.pause()
        setAudio(audios[select])
    }, [videoCompRef, setAudio, audios])

    /** @type {Function} */
    const selectSubtitle = useCallback((select) => {
        setSubtitle(stream.subtitles[select])
    }, [stream, setSubtitle])

    /** @type {Function} */
    const onScrub = useCallback(({ proportion }) => {
        if (previews.length > 0) {
            setPreview(previews[Math.floor(proportion * previews.length)])
        }
    }, [previews, setPreview])

    /** @type {Function} */
    const onChangeEp = useCallback(async (changeEp) => {
        videoCompRef.current.pause()
        await updatePlayHead({ profile, content, videoCompRef })
        if (changeEp && changeEp.total > 0) {
            setPlayContent(changeEp.data[0])
        } else {
            back.doBack()
        }
    }, [videoCompRef, profile, content, setPlayContent])

    /** @type {Function} */
    const onNextEp = useCallback(async (ev) => {
        ev.preventDefault()
        await onChangeEp(await findNextEp({ profile, content, step: +1 }))
    }, [profile, content, onChangeEp])

    /** @type {Function} */
    const onPrevEp = useCallback(async (ev) => {
        ev.preventDefault()
        await onChangeEp(await findNextEp({ profile, content, step: -1 }))
    }, [profile, content, onChangeEp])

    const setPlayHead = useCallback(() => {
        /**@todo corregir */
        if (videoCompRef.current && content) {
            //            hslRef.current.startLoad(-1)
            //            const videoNode = document.querySelector('video')
            //            hslRef.current.startLoad(content.playhead.playhead)
            //            videoNode.currentTime = content.playhead.playhead
            //            videoNode.play().catch(logger.error)
        }
    }, [videoCompRef, content])


    useEffect(() => {

        return () => {
            if (playerRef.current) {
                playerRef.current.reset()
                playerRef.current = null
            }
            if (octopusRes.current) {
                octopusRes.current.dispose()
                octopusRes.current = null
            }
        }
    }, [])

    /*
    useEffect(() => {  // loop playHead
        if (videoCompRef.current) {
            return updatePlayHeadLoop({ profile, content, videoCompRef })
        }
    }, [profile, content, videoCompRef])
    */

    useEffect(() => {  // find audios, it's needed to find stream url
        setAudio(findAudio({ profile, audios }))
    }, [profile, audios, setAudio])

    useEffect(() => {  // find stream url
        if (audios.includes(audio)) {
            findPlayHead({ profile, content })
                .then(playhead => { content.playhead = playhead })
                .then(() => findStream({ profile, audios, audio, getLang }))
                .then(setStream)
        }
    }, [profile, content, audios, audio, getLang, setStream])

    useEffect(() => {  // create dash
        if (stream.url) {
            /**
             * @todo set playhead, onError ?
             */
            Promise.all([
                new Promise((res, rej) => {
                    getContentParam(profile).then(account => {
                        playerRef.current = dashjs.MediaPlayer().create()

                        playerRef.current.extend('RequestModifier', function() {
                            return {
                                modifyRequest: (req) => {
                                    /** @type {Request} */
                                    const request = req
                                    request.headers['Authorization'] = account.token
                                    return customFetch(request.url, request)
                                },
                            }
                        })
                        playerRef.current.initialize()
                        playerRef.current.setAutoPlay(false)
                        playerRef.current.attachView(document.querySelector('video'))
                        // Configuración para Widevine DRM
                        const widevineConfig = {
                            'com.widevine.alpha': {
                                serverURL: 'https://cr-license-proxy.prd.crunchyrollsvc.com/v1/license/widevine',
                                httpRequestHeaders: {
                                    Authorization: account.token,
                                    'X-Cr-Content-Id': audio.guid,
                                    'X-Cr-Video-Token': stream.token,
                                },
                                serverCertificate: SERVER_CERTIFICATE,
                                audioRobustness: 'SW_SECURE_CRYPTO',
                                videoRobustness: 'SW_SECURE_CRYPTO',
                                withCredentials: false,
                                sessionType: 'temporary',

                                //                                pssh: CRUNCHYROLL_SAL_S1E1_PSSH,
                            },
                        }
                        playerRef.current.setProtectionData(widevineConfig)
                        playerRef.current.registerLicenseRequestFilter(async (req) => {
                            try {
                                debugger
                                /** @type {Request} */
                                const request = { ...req }
                                request.headers = { ...req.headers }
                                request.headers['Content-Type'] = 'application/octet-stream'
                                request.headers['Origin'] = 'https://static.crunchyroll.com'
                                request.headers['Referer'] = 'https://static.crunchyroll.com/'
                                //                          request.headers['User-Agent'] = getUserAgent()
                                request.headers['User-Agent'] = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                request.headers['Content-Length'] = req.data.byteLength
                                console.log(request.headers)
                                const res2 = await customFetch(request.url, {
                                    method: request.method,
                                    headers: request.headers,
                                    body: request.data,
                                })
                                console.log(res2)
                            } catch (e) {
                                console.log(e)
                                debugger
                            }
                            return req
                        })
                        playerRef.current.attachSource(stream.url)
                        // hslRef.current.loadSource('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8') // hsl
                        // playerRef.current.attachSource('https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd')  // dash
                        res()
                    }).catch(rej)
                }),
                setSubtitle(findSubtitle({ profile, ...stream })),
                searchPreviews({ ...stream, customFetch }).then(setPreviews)
            ]).then(() => {
                setLoading(false)
            }).catch(logger.error)
        }
        return () => {
            if (stream.url && playerRef.current) {
                playerRef.current.reset()
            }
        }
    }, [setLoading, stream, setSubtitle, profile, setPreviews, setPlayHead, customFetch])

    /*
    useEffect(() => {  // attach subs
        if (subtitle.locale) {
            if (subtitle.locale === 'off') {
                if (octopusRes.current) {
                    octopusRes.current.freeTrack()
                }
            } else {
                if (octopusRes.current) {
                    octopusRes.current.setTrackByUrl(subtitle.url)
                } else {
                    octopusRes.current = createOptapus({ subUrl: subtitle.url })
                }
            }
        }
    }, [subtitle.locale, subtitle.url])
    */

    return (
        <div className={rest.className}>
            <VideoPlayer {...rest}
                title={content.title}
                poster={poster}
                thumbnailSrc={preview}
                onScrub={onScrub}
                onJumpBackward={onPrevEp}
                onJumpForward={onNextEp}
                onEnded={onNextEp}
                loading={loading}
                ref={videoCompRef}
                noAutoPlay>
                <Video id={content.id}>
                    <source src={emptyVideo} />
                </Video>
                <MediaControls>
                    <leftComponents>
                        <ContentInfo content={content} />
                        {['episode'].includes(content.type) &&
                            <Rating profile={profile} content={content} />
                        }
                    </leftComponents>
                    <rightComponents>
                        {stream.subtitles.length > 1 &&
                            <SubtitleSelect subtitles={stream.subtitles}
                                subtitle={subtitle}
                                selectSubtitle={selectSubtitle} />
                        }
                        {stream.audios.length > 1 &&
                            <AudioSelect audios={stream.audios}
                                audio={audio}
                                selectAudio={selectAudio} />
                        }
                        <ContactMe origin='/profiles/home/player' />
                    </rightComponents>
                </MediaControls>
            </VideoPlayer>
        </div>
    )
}

export default Player
