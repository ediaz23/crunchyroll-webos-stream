
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import VideoPlayer, { MediaControls } from '@enact/moonstone/VideoPlayer'
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
import { getContentParam, fetchProxy } from '../../api/utils'
import emptyVideo from '../../../resources/empty.mp4'
import back from '../../back'
import { _PLAY_TEST_, _PLAYER_TYPE_ } from '../../const'
import useCustomFetch from '../../hooks/customFetch'



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
    return subtitles.find(e => e.locale === profile.preferred_content_subtitle_language)
}

/**
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
            logger.info('Optapus ready')
        },
        onError: (e) => {
            logger.error(e)
        },
        _wasm,
    })
}

/**
 * @param {import('dashjs').LicenseResponse} res
 * @return {Promise}
 */
const decodeLicense = async (res) => {
    const uint8Array = new Uint8Array(res.data)
    const textDecoder = new TextDecoder('utf-8')
    const jsonString = textDecoder.decode(uint8Array)
    const jsonObject = JSON.parse(jsonString)
    const rawLicenseBase64 = jsonObject.license
    const binaryString = atob(rawLicenseBase64)
    const newUint8Array = Uint8Array.from(binaryString, char => char.charCodeAt(0))
    res.data = newUint8Array.buffer
}

/**
 * @fixme future cors error
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @return {Function}
 */
const requestLicense = (profile) => {
    /** @param {import('dashjs').LicenseRequest} req */
    return async (req) => {
        /** @type {import('crunchyroll-js-api/src/types').AccountAuth} */
        const account = await getContentParam(profile)
        /** @type {import('dashjs').LicenseRequest} */
        const request = req
        request.headers['Content-Type'] = 'application/octet-stream'
        request.headers['Authorization'] = account.token
    }
}

/**
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @return {Function}
 */
const modifierDashRequest = (profile) => {
    return async (req) => {
        /** @type {import('crunchyroll-js-api/src/types').AccountAuth} */
        const account = await getContentParam(profile)
        /** @type {Request} */
        const request = req
        request.headers = { ...req.headers }
        request.headers['Authorization'] = account.token
        req.url = await fetchProxy(request.url, request)
        return req
    }
}

/**
 * @param {{current: import('dashjs').MediaPlayerClass}} playerRef
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {import('./AudioList').Audio} audio
 * @param {Stream} stream
 * @param {Object} content
 */
const createDashPlayer = async (playerRef, profile, audio, stream, content) => {
    if (!playerRef.current) {
        const dashjs = (await import('dashjs')).default
        playerRef.current = dashjs.MediaPlayer().create()
        if (!_PLAY_TEST_) {
            playerRef.current.extend('RequestModifier', function() {
                return { modifyRequest: modifierDashRequest(profile) }
            })
        }
    }
    playerRef.current.initialize()
    playerRef.current.setAutoPlay(false)
    playerRef.current.attachSource(stream.url + '#t=' + content.playhead.playhead)
    playerRef.current.attachView(document.querySelector('video'))
    if (!_PLAY_TEST_) {
        const widevineConfig = {  // Configuración para Widevine DRM
            'com.widevine.alpha': {
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
        }
        playerRef.current.setProtectionData(widevineConfig)
        playerRef.current.registerLicenseRequestFilter(requestLicense(profile))
        playerRef.current.registerLicenseResponseFilter(decodeLicense)
    }
}

/**
 * @param {import('hls.js').default} player
 * @param {import('hls.js')} Hls
 */
const onHlsError = (player, Hls) => {
    return (_event, data) => {
        switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
                logger.error(`hsl: NETWORK_ERROR ${data.details}`)
                if (data.response.code === 403) {
                    player.destroy()
                } else {
                    if (['manifestLoadError', 'fragLoadError', 'levelLoadError'].includes(data.details)) {
                        player.destroy()
                    } else {
                        setTimeout(() => player.startLoad(), 2000)
                    }
                }
                break
            case Hls.ErrorTypes.MEDIA_ERROR:
                logger.error('hsl: MEDIA_ERROR trying recovery...')
                player.recoverMediaError()
                player.media.play().catch(logger.error)
                break
            default:
                logger.error(`hsl: falta ${data.details}`)
                player.destroy()
                break
        }
    }
}

/**
 * @param {import('hls.js')} Hls
 * @param {Function} reqFunc
 * @return {Class}
 */
const getHlsLoader = (Hls, reqFunc) => {
    let manifestUrl, levelUrl
    return class extends Hls.DefaultConfig.loader {
        load(context, config, callbacks) {
            let originUrl
            if (context.type === 'manifest') {
                // ignore
            } else if (context.type === 'level') {
                originUrl = manifestUrl
            } else {
                originUrl = levelUrl
            }
            const req = { url: context.url, headers: {} }
            if (req.url.startsWith('blob')) {
                /** @type {Array<String>} */
                const originUrlSplit = originUrl.split('/')
                originUrlSplit.pop()
                const blobParsedUrl = new URL(req.url)
                const realUrl = new URL(blobParsedUrl.pathname)
                originUrlSplit.push(realUrl.pathname.substring(1))
                req.url = originUrlSplit.join('/')
            }
            if (context.type === 'manifest') {
                manifestUrl = req.url
            } else if (context.type === 'level') {
                levelUrl = req.url
            }
            reqFunc(req).then(() => {
                context.url = req.url
                super.load(context, config, callbacks)
            })
        }
    }
}

/**
 * @param {{current: import('hls.js').default}} playerRef
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {import('./AudioList').Audio} audio
 * @param {Stream} stream
 * @param {Object} content
 */
const createHlsPlayer = async (playerRef, profile, audio, stream, content) => {
    const Hls = (await import('hls.js')).default
    const reqFunc = modifierDashRequest(profile)

    if (!playerRef.current) {
        const config = { progressive: true }
        if (!_PLAY_TEST_) {
            config.loader = getHlsLoader(Hls, reqFunc)
            config.drmSystems = {
                'com.widevine.alpha': {
                    licenseUrl: 'https://cr-license-proxy.prd.crunchyrollsvc.com/v1/license/widevine',
                    serverCertificateUrl: `data:application/octet-stream;base64,${api.config.SERVER_CERTIFICATE}`,
                }
            }
            config.drmSystemOptions = {
                audioRobustness: 'SW_SECURE_CRYPTO',
                videoRobustness: 'SW_SECURE_CRYPTO',
                sessionType: 'temporary',
            }
        }
        playerRef.current = new Hls(config)
    }

    return new Promise((res, rej) => {
        playerRef.current.config.capLevelToPlayerSize = true
        playerRef.current.on(Hls.Events.ERROR, onHlsError(playerRef.current, Hls, rej))
        playerRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
            /** @todo check double event listener */
            playerRef.current.attachMedia(document.querySelector('video'))
            res()
        })
        playerRef.current.loadSource(stream.url + '#t=' + content.playhead.playhead)
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
    const audios = useMemo(() => searchAudios({ content, getLang }), [content, getLang])
    const poster = useMemo(() => findPoster({ content }), [content])
    /** @type {[import('./AudioList').Audio, Function]} */
    const [audio, setAudio] = useState({})
    /** @type {[import('./SubtitleList').Subtitle, Function]} */
    const [subtitle, setSubtitle] = useState(null)
    /** @type {[Array<String>, Function]} */
    const [previews, setPreviews] = useState([])
    /** @type {[String, Function]} */
    const [preview, setPreview] = useState({})
    /** @type {{current:import('@enact/moonstone/VideoPlayer/VideoPlayer').VideoPlayerBase}} */
    const videoCompRef = useRef(null)
    /** @type {{current: import('dashjs').MediaPlayerClass}*/
    /** @type {{current: import('hls.js').default}*/
    const playerRef = useRef(null)
    /** @type {{current: import('libass-wasm')}*/
    const octopusRef = useRef(null)
    /** @type {Stream} */
    const emptyStream = useMemo(() => {
        return { url: null, bif: null, token: null, session: null, audios: [], subtitles: [] }
    }, [])
    /** @type {[Stream, Function]} */
    const [stream, setStream] = useState(emptyStream)
    /** @type {[StreamSession, Function]} */
    const [session, setSession] = useState(null)
    /** @type {{current: Number}*/
    const plauseTimeoutRef = useRef(null)

    /** @type {Function} */
    const beforeChangeVideo = useCallback(() => {
        if (videoCompRef.current) {
            videoCompRef.current.pause()
        }
        setLoading(true)
        setStream(emptyStream)
        clearTimeout(plauseTimeoutRef.current)
        plauseTimeoutRef.current = null
    }, [setLoading, setStream, emptyStream])

    /** @type {Function} */
    const beforeDestroy = useCallback(() => {
        if (videoCompRef.current) {
            videoCompRef.current.pause()
        }
        if (octopusRef.current) {
            octopusRef.current.dispose()
            octopusRef.current = null
        }
        if (playerRef.current) {
            playerRef.current.destroy()
            playerRef.current = null
        }
        clearTimeout(plauseTimeoutRef.current)
        plauseTimeoutRef.current = null
    }, [])

    /** @type {Function} */
    const selectAudio = useCallback((select) => {
        beforeChangeVideo()
        setAudio(audios[select])
    }, [setAudio, audios, beforeChangeVideo])

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
            beforeChangeVideo()
            setTimeout(() => setPlayContent({ ...changeEp.data[0] }), 100)
        } else {
            beforeDestroy()
            back.doBack()
        }
    }, [videoCompRef, profile, content, setPlayContent, beforeDestroy, beforeChangeVideo])

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

    /** @type {Function} */
    const onPause = useCallback(() => {
        if (session) {
            plauseTimeoutRef.current = setTimeout(() => {
                beforeDestroy()
                back.doBack()
            }, session.maximumPauseSeconds * 1000)
        }
    }, [session, beforeDestroy])

    /** @type {Function} */
    const onPlay = useCallback(() => {
        clearTimeout(plauseTimeoutRef.current)
        plauseTimeoutRef.current = null
    }, [])

    useEffect(() => {  // find audios, it's needed to find stream url
        setAudio(findAudio({ profile, audios }))
    }, [profile, audios, setAudio])

    useEffect(() => {  // find stream url
        if (audios.includes(audio)) {
            if (_PLAY_TEST_) {
                findPlayHead({ profile, content })
                    .then(playhead => { content.playhead = playhead })
                    .then(() => {
                        setStream({
                            url: _PLAYER_TYPE_ === 'dash' ?
                                'http://localhost:8052/kimi.mpd' :
                                'http://localhost:8052/hls/kimi.m3u8',
                            bif: 'http://localhost:8052/kimi.bif',
                            subtitles: [{
                                locale: 'es-419',
                                url: 'http://localhost:8052/kimi.ass'
                            }],
                            audios: []
                        })
                    })
            } else {
                findPlayHead({ profile, content })
                    .then(playhead => { content.playhead = playhead })
                    .then(() => findStream({ profile, audios, audio, getLang }))
                    .then(setStream)
            }
        }
    }, [profile, content, audios, audio, getLang, setStream])

    useEffect(() => { setSession(stream.session) }, [stream, setSession])

    useEffect(() => {  // renew session keep alive
        let sessionTimeout = null
        if (session) {
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
        if (stream.url) {
            Promise.all([
                new Promise((res) => {
                    if (_PLAYER_TYPE_ === 'dash') {
                        createDashPlayer(playerRef, profile, audio, stream, content).then(res)
                    } else if (_PLAYER_TYPE_ === 'hls') {
                        createHlsPlayer(playerRef, profile, audio, stream, content).then(res)
                    }
                }),
                setSubtitle(findSubtitle({ profile, ...stream })),
                searchPreviews({ ...stream, customFetch }).then(setPreviews)
            ]).then(() => {
                setLoading(false)
            }).catch(logger.error)
        }
        return () => {
            if (stream.token) {
                api.drm.deleteToken(profile, { episodeId: audio.guid, token: stream.token })
            }
            if (_PLAYER_TYPE_ === 'dash') {
                if (playerRef.current) {
                    playerRef.current.reset()
                }
            }
        }
    }, [setLoading, content, stream, setSubtitle, profile, setPreviews, customFetch, audio])

    useEffect(() => {  // attach subs
        if (!loading) {
            let prom = Promise.resolve()
            if (_PLAYER_TYPE_ === 'dash') {
                playerRef.current.pause()
            } else if (_PLAYER_TYPE_ === 'hls') {
                playerRef.current.media.pause()
            }
            /*
            if (subtitle && subtitle.locale) {
                if (subtitle.locale === 'off') {
                    if (octopusRef.current) {
                        octopusRef.current.freeTrack()
                    }
                } else {
                    prom = fetchProxy(subtitle.url).then(subUrl => {
                        if (octopusRef.current) {
                            octopusRef.current.setTrackByUrl(subUrl)
                        } else {
                            octopusRef.current = createOptapus({ subUrl })
                        }
                    })
                }
            }
            */
            prom.then(() => {
                if (_PLAYER_TYPE_ === 'dash') {
                    playerRef.current.play()
                } else if (_PLAYER_TYPE_ === 'hls') {
                    playerRef.current.media.play()
                }
            })
        }
        return () => {
            if (octopusRef.current) {
                octopusRef.current.freeTrack()
            }
        }
    }, [subtitle, loading])

    useEffect(() => {  // loop playHead
        if (!loading && videoCompRef.current && content) {
            return updatePlayHeadLoop({ profile, content, videoCompRef })
        }
    }, [profile, content, videoCompRef, loading])

    useEffect(() => {  // clean subtitles octopus
        const onBack = (inEvent) => {
            let keycode
            if (window.event) {
                keycode = inEvent.keyCode;
            } else if (inEvent.which) {
                keycode = inEvent.which;
            }
            if (keycode === 461) {
                beforeDestroy()
            }
        }
        window.addEventListener('keydown', onBack)
        return () => {
            window.removeEventListener('keydown', onBack)
        }
    }, [beforeDestroy])

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
