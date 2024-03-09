
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import VideoPlayer, { MediaControls } from '@enact/moonstone/VideoPlayer'
import { useRecoilValue, useRecoilState } from 'recoil'
import dashjs from 'dashjs'
//import dashjs from 'dashjs/dist/dash.all.debug'

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
import { _PLAY_TEST_, _LOCALHOST_SERVER_ } from '../../const'
import useCustomFetch from '../../hooks/customFetch'


/**
 * Object to store URL objects to clean later
 * @type {Object.<String, String>}
 */
const URL_OBJECTS = {}
/**
 * Sometimes when destroy the player throw error because some
 * requests are still wating, so i have to wait all request to
 * finish to destroy it.
 * @type {Array<String>}
 */
const REQ_LIST = []

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
 * @property {String} id
 * @property {Array<{url: String, locale: String}>} urls
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
            guid: content.id,
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
    let sub = subtitles.find(e => e.locale === profile.preferred_content_subtitle_language)
    if (!sub) {
        sub = subtitles[0]
    }
    return sub
}

/**
 * @param {{
    profile: import('crunchyroll-js-api/src/types').Profile,
    audios: Array<import('./AudioList').Audio>,
    audio: import('./AudioList').Audio,
    getLang: Function,
    content: Object,
  }}
 * @returns {Promise<Stream>}
 */
const findStream = async ({ profile, audios, audio, getLang, content }) => {
    let data = {}, urls = []

    if (['episode', 'movie'].includes(audio.type)) {
        data = await api.drm.getStreams(profile, { episodeId: audio.guid })
    } else if (['musicConcert', 'musicVideo'].includes(audio.type)) {
        data = await api.drm.getStreams(profile, { episodeId: audio.guid, type: 'music' })
    }
    if (data.hardSubs) {
        urls = Object.keys(data.hardSubs).map(locale => {
            return { locale, url: data.hardSubs[locale].url }
        })
    }
    /** @type {Stream} */
    const out = {
        id: content.id,
        urls: [{ locale: 'off', url: data.url }, ...urls],
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
        /** @type {Uint8Array} */
        const bifData = await await customFetch(bif, {}, true)
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
 * @param {import('dashjs').LicenseResponse} res
 * @return {}
 */
const decodeLicense = (res) => {
    if (res.url.endsWith('widevine')) {
        const uint8Array = new Uint8Array(res.data)
        const textDecoder = new TextDecoder('utf-8')
        const jsonString = textDecoder.decode(uint8Array)
        const jsonObject = JSON.parse(jsonString)
        const binaryString = atob(jsonObject.license)
        const newUint8Array = Uint8Array.from(binaryString, char => char.charCodeAt(0))
        res.data = newUint8Array.buffer
    }
}

/**
 * @fixme future cors error
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @return {Function}
 */
const requestDashLicense = (profile) => {
    /** @param {import('dashjs').LicenseRequest} req */
    return async (req) => {
        /** @type {import('crunchyroll-js-api/src/types').AccountAuth} */
        const account = await getContentParam(profile)
        if (req.url.endsWith('widevine')) {
            req.headers['Content-Type'] = 'application/octet-stream'
        } else if (req.url.endsWith('playReady')) {
            req.headers['Content-Type'] = 'text/xml'
        }
        req.headers['Authorization'] = account.token
    }
}

/**
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Function} customFetch
 * @return {Function}
 */
const modifierDashRequest = (profile, customFetch) => {
    return async (req) => {
        /** @type {import('crunchyroll-js-api/src/types').AccountAuth} */
        const account = await getContentParam(profile)
        /** @type {Request} */
        const request = req
        request.headers = { ...req.headers }
        request.headers['Authorization'] = account.token
        const urlBak = request.url
        const reqId = REQ_LIST.length  // check variable comment
        const prom = customFetch(urlBak, request, true)
        REQ_LIST.push(prom)
        /** @type {Uint8Array} */
        const data = await prom
        req.url = URL.createObjectURL(new window.Blob([data]))
        URL_OBJECTS[urlBak] = req.url  // check variable comment
        REQ_LIST[reqId] = undefined
        return req
    }
}

/**
 * Wait to all promise of modifierDashRequest finish
 * @returns {Promise}
 */
const waitAllReqFinish = async (reset) => {
    await Promise.all(REQ_LIST)
    if (reset) {
        REQ_LIST.length = 0
    }
}


/**
 * Free url object after being loaded
 * @param {{request: {url: string}}}
 */
const freeUrlObjects = ({ request }) => {
    if (URL_OBJECTS[request.url]) {
        URL.revokeObjectURL(URL_OBJECTS[request.url])
        delete URL_OBJECTS[request.url]
    }
}

/**
 * Clean all url object
 */
const freeAllUrlObjects = () => {
    for (const url of Object.keys(URL_OBJECTS)) {
        freeUrlObjects({ request: { url } })
    }
}



/**
 * @param {{current: import('dashjs').MediaPlayerClass}} playerRef
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {import('./AudioList').Audio} audio
 * @param {Stream} stream
 * @param {Object} content
 * @param {import('./SubtitleList').Subtitle} subtitle
 * @param {Function} customFetch
 */
const createDashPlayer = async (playerRef, profile, audio, stream, content, subtitle, customFetch) => {
    let url = null
    if (!playerRef.current) {
        playerRef.current = dashjs.MediaPlayer().create()
        playerRef.current.extend('RequestModifier', function() {
            return { modifyRequest: modifierDashRequest(profile, customFetch) }
        })
        /*
        playerRef.current.updateSettings({
            streaming: {
                buffer: {
                    // https://reference.dashif.org/dash.js/nightly/samples/buffer/initial-buffer.html
                    initialBufferLevel: 20,
                    // https://reference.dashif.org/dash.js/nightly/samples/buffer/buffer-target.html
                    bufferTimeAtTopQuality: 30,
                    bufferTimeAtTopQualityLongForm: 60,
                    stableBufferTime: 15,
                    longFormContentDurationThreshold: 600,
                }
            }
        })
        */
    }
    url = stream.urls.find(val => val.locale === subtitle.locale)
    if (!url) {
        url = stream.urls.find(val => val.locale === 'off')
    }
    if (url) {
        url = url.url
    }
    playerRef.current.initialize()
    playerRef.current.setAutoPlay(false)
    playerRef.current.attachSource(url + '#t=' + content.playhead.playhead)
    playerRef.current.attachView(document.querySelector('video'))
    if (!_PLAY_TEST_) {
        const drmConfig = {
            'com.widevine.alpha': {
                priority: 1,
                serverURL: 'https://cr-license-proxy.prd.crunchyrollsvc.com/v1/license/widevine',
                httpRequestHeaders: {
                    'X-Cr-Content-Id': audio.guid,
                    'X-Cr-Video-Token': stream.token,
                },
                serverCertificate: api.config.SERVER_CERTIFICATE,
                audioRobustness: 'SW_SECURE_CRYPTO',
                videoRobustness: 'SW_SECURE_CRYPTO',
                sessionType: 'temporary',
            },
            'com.microsoft.playready': {
                priority: 2,
                serverURL: 'https://cr-license-proxy.prd.crunchyrollsvc.com/v1/license/playReady',
                httpRequestHeaders: {
                    SOAPAction: '"http://schemas.microsoft.com/DRM/2007/03/protocols/AcquireLicense"',
                    'X-Cr-Content-Id': audio.guid,
                    'X-Cr-Video-Token': stream.token,
                },
                serverCertificate: api.config.SERVER_CERTIFICATE,
                audioRobustness: 'SW_SECURE_CRYPTO',
                videoRobustness: 'SW_SECURE_CRYPTO',
                sessionType: 'temporary',
            },
            'com.apple.fairplay': {
                priority: 3,
                certificateURL: 'https://lic.drmtoday.com/license-server-fairplay/cert/',
                licenseURL: 'https://cr-license-proxy.prd.crunchyrollsvc.com/v1/license/fairPlay',
                audioRobustness: 'SW_SECURE_CRYPTO',
                videoRobustness: 'SW_SECURE_CRYPTO',
                sessionType: 'temporary',
            },
        }
        playerRef.current.setProtectionData(drmConfig)
        playerRef.current.registerLicenseRequestFilter(requestDashLicense(profile))
        playerRef.current.registerLicenseResponseFilter(decodeLicense)
    }
    playerRef.current.on(dashjs.MediaPlayer.events.MANIFEST_LOADING_FINISHED, freeUrlObjects)
    playerRef.current.on(dashjs.MediaPlayer.events.FRAGMENT_LOADING_COMPLETED, freeUrlObjects)
    playerRef.current.on(dashjs.MediaPlayer.events.FRAGMENT_LOADING_ABANDONED, freeUrlObjects)

    playerRef.current.on(dashjs.MediaPlayer.events.ERROR, (e) => {
        console.error('Generic error', e, new Error('test'))
    })
    playerRef.current.on(dashjs.MediaPlayer.events.KEY_ERROR, (e) => {
        console.error('KEY_ERROR', e, new Error('test'))
    })
    playerRef.current.on(dashjs.MediaPlayer.events.PLAYBACK_ERROR, (e) => {
        console.error('PLAYBACK_ERROR', e, new Error('test'))
    })

}


const Player = ({ ...rest }) => {
    /** @type {[Boolean, Function]} */
    const [loading, setLoading] = useState(true)
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
    const audios = useMemo(() => {
        return searchAudios({ content, getLang })
    }, [content, getLang])
    const poster = useMemo(() => findPoster({ content }), [content])
    /** @type {[import('./AudioList').Audio, Function]} */
    const [audio, setAudio] = useState({})
    /** @type {[import('./SubtitleList').Subtitle, Function]} */
    const [subtitle, setSubtitle] = useState(null)
    /** @type {[Array<String>, Function]} */
    const [previews, setPreviews] = useState([])
    /** @type {[String, Function]} */
    const [preview, setPreview] = useState({})
    /** @type {[Event, Function]} */
    const [endEvent, setEndEvent] = useState(null)
    /** @type {{current:import('@enact/moonstone/VideoPlayer/VideoPlayer').VideoPlayerBase}} */
    const videoCompRef = useRef(null)
    /** @type {{current: import('dashjs').MediaPlayerClass}*/
    const playerRef = useRef(null)
    /** @type {Stream} */
    const emptyStream = useMemo(() => {
        return {
            id: null, urls: null, bif: null, token: null, session: null, audios: [],
            subtitles: []
        }
    }, [])
    /** @type {[Stream, Function]} */
    const [stream, setStream] = useState(emptyStream)
    /** @type {[StreamSession, Function]} */
    const [session, setSession] = useState(null)
    /** @type {{current: Number}*/
    const plauseTimeoutRef = useRef(null)

    /** @type {Function} */
    const changeAudio = useCallback((audioP) => {
        setStream(emptyStream)
        setAudio(audioP)
    }, [setAudio, setStream, emptyStream])

    /** @type {Function} */
    const selectAudio = useCallback((select) => {
        changeAudio(audios[select])
    }, [changeAudio, audios])

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
        await updatePlayHead({ profile, content, videoCompRef })
        if (changeEp && changeEp.total > 0) {
            changeAudio({})
            setPlayContent({ ...changeEp.data[0] })
        } else {
            back.doBack()
        }
    }, [videoCompRef, profile, content, setPlayContent, changeAudio])

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

    const onEndVideo = useCallback((ev) => setEndEvent(ev), [setEndEvent])

    /** @type {Function} */
    const onPause = useCallback(() => {
        if (session) {
            plauseTimeoutRef.current = setTimeout(() => {
                back.doBack()
            }, session.maximumPauseSeconds * 1000)
        }
    }, [session])

    /** @type {Function} */
    const onPlay = useCallback(() => {
        clearTimeout(plauseTimeoutRef.current)
        plauseTimeoutRef.current = null
    }, [])

    useEffect(() => {  // find audios, it's needed to find stream url
        waitAllReqFinish().then(() => {
            changeAudio(findAudio({ profile, audios }))
            setEndEvent(null)
        })
    }, [profile, audios, changeAudio, setEndEvent])

    useEffect(() => {  // find stream url
        /** @type {Stream} */
        let localStream = emptyStream
        if (audios.includes(audio)) {
            const load = async () => {
                content.playhead = await findPlayHead({ profile, content })
                if (_PLAY_TEST_) {  // test stream
                    localStream = {
                        id: content.id,
                        urls: [{ url: `${_LOCALHOST_SERVER_}/kimi.mpd`, locale: 'es-419' }],
                        bif: `${_LOCALHOST_SERVER_}/kimi.bif`,
                        subtitles: [{
                            locale: 'es-419',
                            url: `${_LOCALHOST_SERVER_}/kimi.ass`
                        }],
                        audios: []
                    }
                } else {
                    localStream = await findStream({ profile, audios, audio, getLang, content })
                }
                setStream(localStream)
                setSession(localStream.session)
            }
            load().catch(console.error)
        }
        return () => {
            if (localStream.token) {
                api.drm.deleteToken(profile, { episodeId: audio.guid, token: localStream.token })
            }
            setStream(emptyStream)
            setSession(null)
        }
    }, [profile, content, audios, audio, getLang, setStream, emptyStream])

    useEffect(() => {  // renew session keep alive
        let sessionTimeout = null
        if (session && stream.token) {
            sessionTimeout = setTimeout(() => {
                /** @type {{paused: boolean, currentTime: number}} */
                const state = videoCompRef.current.getMediaState()
                api.drm.keepAlive(profile, {
                    episodeId: audio.guid,
                    token: stream.token,
                    playhead: state.currentTime,
                }).then(setSession)
            }, session.renewSeconds * 1000 - 50)
        }
        return () => clearTimeout(sessionTimeout)
    }, [profile, audio, stream, session, setSession])

    useEffect(() => {  // create dash player
        /** @type {Array<String>} */
        let previewsBak = null
        if (stream.urls) {
            const load = async () => {
                setSubtitle(findSubtitle({ profile, ...stream }))
                previewsBak = await searchPreviews({ ...stream, customFetch })
                setPreviews(previewsBak)
            }
            load().catch(console.error)
        }
        return () => {
            if (previewsBak) {
                previewsBak.forEach(image => URL.revokeObjectURL(image))
                previewsBak = null
                setPreviews([])
            }
            setSubtitle(null)
        }
    }, [profile, stream, setSubtitle, setPreviews, customFetch])

    useEffect(() => {  // attach subs
        if (stream.urls && subtitle && stream.id === content.id) {
            const load = async () => {
                await createDashPlayer(playerRef, profile, audio, stream, content, subtitle, customFetch)
                setLoading(false)
                playerRef.current.play()
            }
            load().catch(console.error)
        }
        return () => {
            setLoading(true)
            if (playerRef.current) {
                playerRef.current.pause()
                const oldPlayer = playerRef.current
                waitAllReqFinish(true).then(() => {
                    oldPlayer.destroy()
                    freeAllUrlObjects()
                })
                playerRef.current = null
            }
            freeAllUrlObjects()
            if (plauseTimeoutRef.current) {
                clearTimeout(plauseTimeoutRef.current)
                plauseTimeoutRef.current = null
            }
        }
    }, [profile, content, stream, audio, subtitle, setLoading, customFetch])

    useEffect(() => {  // loop playHead
        if (!_PLAY_TEST_) {
            if (!loading && videoCompRef.current && content) {
                return updatePlayHeadLoop({ profile, content, videoCompRef })
            }
        }
    }, [profile, content, videoCompRef, loading])

    useEffect(() => {
        if (!_PLAY_TEST_) {
            let timeout = null
            if (endEvent) {
                timeout = setTimeout(() => {
                    onNextEp(endEvent)
                    setEndEvent(null)
                }, 4000)
            }
            return () => clearTimeout(timeout)
        }
    }, [endEvent, onNextEp, audios])

    return (
        <div className={rest.className}>
            <VideoPlayer {...rest}
                title={content.title}
                poster={poster}
                thumbnailSrc={preview}
                onScrub={onScrub}
                onJumpBackward={onPrevEp}
                onJumpForward={onNextEp}
                onEnded={onEndVideo}
                onPause={onPause}
                onPlay={onPlay}
                loading={loading}
                ref={videoCompRef}
                noAutoPlay>
                <video id={content.id}>
                    <source src={emptyVideo} />
                </video>
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
