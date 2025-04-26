
import './dash.all.min'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import VideoPlayer, { MediaControls } from '@enact/moonstone/VideoPlayer'
import Button from '@enact/moonstone/Button'
import IconButton from '@enact/moonstone/IconButton'
import Spotlight from '@enact/spotlight'
import { useRecoilValue, useRecoilState } from 'recoil'
import { CrunchyrollError } from 'crunchyroll-js-api'

import AudioSelect from './AudioSelect'
import SubtitleSelect from './SubtitleSelect'
import Rating from './Rating'
import ContentInfo from './ContentInfo'
import ContactMe from '../login/ContactMe'
import PopupMessage from '../Popup'
import { currentProfileState, playContentState } from '../../recoilConfig'
import { useGetLanguage } from '../../hooks/language'
import * as fetchUtils from '../../hooks/customFetch'
import { $L } from '../../hooks/language'
import logger from '../../logger'
import api from '../../api'
import { getContentParam } from '../../api/utils'
import emptyVideo from '../../../assets/empty.mp4'
import back from '../../back'
import { _PLAY_TEST_, _LOCALHOST_SERVER_ } from '../../const'
import XHRLoader from '../../patch/XHRLoader'
import utils from '../../utils'


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
 * @property {import('crunchyroll-js-api').Types.Profile} profile
 * @property {String} skipUrl
 */

/**
 * @typedef SkiptEvent
 * @type {Object}
 * @property {String} approverId
 * @property {String} distributionNumber
 * @property {Number} end
 * @property {String} seriesId
 * @property {Number} start
 * @property {String} title
 * @property {String} type
 * @property {Function} process
 */

/** @type {{dashjs: import('dashjs')}*/
const { dashjs } = window
/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.content
 * @param {{current: import('@enact/moonstone/VideoPlayer/VideoPlayer').VideoPlayerBase}} obj.playerCompRef
 * @returns {Promise}
 */
const updatePlayHead = async ({ profile, content, playerCompRef }) => {
    if (['episode', 'movie'].includes(content.type)) {
        /** @type {{paused: boolean, currentTime: number}} */
        const state = playerCompRef.current.getMediaState()
        content.playhead.playhead = Math.floor(state.currentTime)
        return api.content.savePlayhead(profile, {
            contentId: content.id,
            playhead: Math.floor(state.currentTime),
        })
    }
}

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.content
 * @param {{current: import('@enact/moonstone/VideoPlayer/VideoPlayer').VideoPlayerBase}} obj.playerCompRef
 * @returns {Function}
 */
const updatePlayHeadLoop = ({ profile, content, playerCompRef }) => {
    const interval = setInterval(() => {
        if (playerCompRef.current) {
            /** @type {{paused: boolean, currentTime: number}} */
            const state = playerCompRef.current.getMediaState()
            if (!state.paused) {
                updatePlayHead({ profile, content, playerCompRef }).catch(logger.error)
            }
        }
    }, 1000 * 15) // every 15 sec
    return () => clearInterval(interval)
}

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.content
 * @returns {Promise<{playhead: Number, fully_watched: Boolean}>}
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
 * @param {Object} obj
 * @param {Object} obj.content
 * @param {Function} obj.getLang
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
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Array<import('./AudioList').Audio>} obj.audios
 * @returns {Promise<import('./AudioList').Audio>}
 */
const findAudio = async ({ profile, audios }) => {
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
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Array<import('./SubtitleList').Subtitle>} obj.subtitles
 * @returns {Promise<import('./SubtitleList').Subtitle>}
 */
const findSubtitle = async ({ profile, subtitles }) => {
    let sub = subtitles.find(e => e.locale === profile.preferred_content_subtitle_language)
    if (!sub) {
        sub = subtitles[0]
    }
    return sub
}

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Array<import('./AudioList').Audio>} obj.audios
 * @param {import('./AudioList').Audio} obj.audio
 * @param {Function} obj.getLang
 * @param {Object} obj.content
 * @returns {Promise<Stream>}
 */
const findStream = async ({ profile, audios, audio, getLang, content }) => {
    /** @type {Stream} */
    let out = null, data = {}, urls = []
    if (_PLAY_TEST_) {  // test stream
        content.playhead = { playhead: 12 }
        out = {
            id: content.id,
            urls: [{ url: `${_LOCALHOST_SERVER_}/frieren-26.mpd`, locale: 'es-419' }],
            bif: `${_LOCALHOST_SERVER_}/frieren-26.bif`,
            audios: [],
            subtitles: [{
                locale: 'es-419',
                url: `${_LOCALHOST_SERVER_}/frieren-26.ass`
            }],
            profile,
            skipUrl: `${_LOCALHOST_SERVER_}/frieren-26.json`

        }
    } else {
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
        content.playhead = await findPlayHead({ profile, content })
        out = {
            id: content.id,
            urls: [{ locale: 'off', url: data.url }, ...urls],
            bif: data.bifs,
            audios: audios,
            subtitles: [{ language: 'off', }, ...Object.values(data.subtitles)].map(subtitle => {
                return { ...subtitle, locale: subtitle.language, title: getLang(subtitle.language) }
            }),
            profile,
            skipUrl: `https://static.crunchyroll.com/skip-events/production/${audio.guid}.json`,
            session: data.session,
            token: data.token,
        }
    }
    return out
}

/**
 * Download file per chunkSize
 * @param {String} url
 * @param {Number} chunkSize
 * @returns {Promise<{bifData: Uint8Array, requests: Array<Promise>}>}
 */
const downloadBifFile = async (url, chunkSize = 256 * 1024) => {
    const headResponse = await fetchUtils.customFetch(url, { method: 'HEAD' })
    /** @type {Uint8Array} */
    let bifData = null
    /** @type {Array<Promise>} */
    const requests = []
    if (headResponse.ok) {
        const totalSize = parseInt(headResponse.headers.get('Content-Length'))
        if (isNaN(totalSize) || !totalSize) {
            throw new Error('Bif size not working')
        }
        bifData = new Uint8Array(totalSize)
        for (let start = 0; start < totalSize; start += chunkSize) {
            const end = Math.min(start + chunkSize - 1, totalSize - 1)
            const reqConfig = { headers: { Range: `bytes=${start}-${end}` } }
            requests.push(fetchUtils.customFetch(url, reqConfig, true))
            requests[requests.length - 1].then(chunkArray => bifData.set(chunkArray, start))
        }
    }

    return { bifData, requests }
}

/**
 * @todo improve memory usage
 * @param {{ bif: String }} obj
 * @returns {Promise<{chunks: Array<{start: int, end: int, url: string}>}>}
 */
const findPreviews = async ({ bif }) => {
    /** @type {{chunks: Array<{start: int, end: int, url: string}>}} */
    const out = { chunks: [] }

    try {
        if (bif) {
            /** @type {{bifData: Uint8Array, requests: Array<Promise>}} */
            const { bifData, requests } = await downloadBifFile(bif)
            const jpegStartMarker = new Uint8Array([0xFF, 0xD8]) // JPEG Init

            let imageStartIndex = -1
            let currentChunkIndex = -1;
            for (let i = 0; i < bifData.length - 1; i++) {
                const chunkIndex = Math.floor((i / bifData.length) * requests.length);

                if (chunkIndex !== currentChunkIndex) {
                    currentChunkIndex = chunkIndex
                    await requests[chunkIndex]
                }
                if (bifData[i] === jpegStartMarker[0] && bifData[i + 1] === jpegStartMarker[1]) {
                    if (imageStartIndex !== -1) {
                        const chunk = bifData.slice(imageStartIndex, i)
                        const blob = new window.Blob([chunk], { type: 'image/jpeg' })
                        const url = window.URL.createObjectURL(blob)
                        out.chunks.push({ start: imageStartIndex, end: i, url })
                    }
                    imageStartIndex = i
                }
            }
            await requests[requests.length - 1]
            if (imageStartIndex !== -1) {
                const chunk = bifData.slice(imageStartIndex)
                const blob = new window.Blob([chunk], { type: 'image/jpeg' })
                const url = window.URL.createObjectURL(blob)
                out.chunks.push({ start: imageStartIndex, url })
            }
        }
    } catch (e) {
        logger.error(e)
    }
    return out
}

/**
 * @param {{ content: Object }}
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
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.content
 * @param {Number} obj.step
 * @param {Array<String>} obj.videos
 * @param {Function} obj.apiFunction
 * @returns {Promise<Object>}
 */
const getNextVideoOrConcert = async ({ profile, content, step, videos, apiFunction }) => {
    let out = null
    const index = videos.findIndex(val => val === content.id)
    const nextIndex = index + step
    if (index >= 0 && nextIndex >= 0 && nextIndex < videos.length) {
        const { data: newConcerts } = await apiFunction(profile, [videos[nextIndex]])
        if (newConcerts.length > 0) {
            out = newConcerts[0]
        }
    }
    return out
}

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.content
 * @param {Number} obj.step
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
        /** @type {{videos: Array<Object>}} */
        const { videos } = content
        if (videos) {
            const videoIndex = videos.findIndex(item => item.id === content.id)
            const nextIndex = videoIndex + step
            if (0 <= nextIndex && nextIndex < videos.length) {
                out = { total: 1, data: [{ ...videos[nextIndex] }] }
            }
        } else {
            const { data: artists } = await api.music.getArtists(profile, [content.artist.id])
            if (artists.length > 0) {
                const params = { profile, content, step }
                if ('musicConcert' === content.type) {
                    out = await getNextVideoOrConcert({
                        ...params,
                        videos: artists[0].concerts,
                        apiFunction: api.music.getConcerts
                    })
                } else if ('musicVideo' === content.type) {
                    out = await getNextVideoOrConcert({
                        ...params,
                        videos: artists[0].videos,
                        apiFunction: api.music.getVideos
                    })
                }
                if (out) {
                    out = { total: 1, data: [out] }
                }
            }
        }
    }
    if (out && out.total > 0) {
        out.data[0].type = content.type
        if (['episode', 'movie'].includes(content.type)) {
            await api.content.savePlayhead(profile, { contentId: out.data[0].id, playhead: 0 })
        }
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
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @return {Function}
 */
const requestDashLicense = (profile) => {
    /** @param {import('dashjs').LicenseRequest} req */
    return async (req) => {
        /** @type {import('crunchyroll-js-api').Types.AccountAuth} */
        const account = await getContentParam(profile)
        req.headers = req.headers || {};
        if (req.url.endsWith('widevine')) {
            req.headers['Content-Type'] = 'application/octet-stream'
        } else if (req.url.endsWith('playReady')) {
            req.headers['Content-Type'] = 'text/xml'
        }
        req.headers['Authorization'] = account.token
    }
}

/**
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @return {Function}
 */
const modifierDashRequest = (profile) => {
    return async (req) => {
        /** @type {import('crunchyroll-js-api').Types.AccountAuth} */
        const account = await getContentParam(profile)
        /** @type {Request} */
        const request = req
        request.headers = { ...req.headers }
        request.headers['Authorization'] = account.token
        return req
    }
}

/**
 * @param {import('dashjs').MediaPlayerClass} dashPlayer
 */
const setStreamingConfig = async (dashPlayer) => {

    let bufferTimeDefault = 20
    let bufferTimeAtTopQuality = 100
    let bufferTimeAtTopQualityLongForm = 200
    let bufferToKeep = 10
    let isHighEndDevice = true

    if (utils.isTv()) {
        const parseRamSizeInGB = (ddrSizeString) => {
            const match = ddrSizeString.match(/([\d.]+)G/i);
            return match ? parseFloat(match[1]) : 0;
        }

        /** @type {import('webostvjs').DeviceInfo}*/
        const deviceInfo = await new Promise(res => webOS.deviceInfo(res))
        const ramInGB = parseRamSizeInGB(deviceInfo.ddrSize || '1G')
        const is4KOrHigher = (deviceInfo.screenWidth >= 3840 && deviceInfo.screenHeight >= 2160)
        const hasHighDynamicRange = deviceInfo.hdr10 || deviceInfo.dolbyVision || false
        isHighEndDevice = ramInGB >= 1.5 || is4KOrHigher || hasHighDynamicRange

        if (isHighEndDevice) {
            bufferTimeDefault = 25
            bufferTimeAtTopQuality = 150
            bufferTimeAtTopQualityLongForm = 300
            bufferToKeep = 15
        } else if (ramInGB >= 1) {
            bufferTimeDefault = 22
            bufferTimeAtTopQuality = 120
            bufferTimeAtTopQualityLongForm = 250
            bufferToKeep = 12
        } else {
            bufferTimeDefault = 15
            bufferTimeAtTopQuality = 80
            bufferTimeAtTopQualityLongForm = 150
            bufferToKeep = 8
        }
    }

    dashPlayer.updateSettings({
        streaming: {
            buffer: {
                bufferTimeDefault,
                bufferTimeAtTopQuality,
                bufferTimeAtTopQualityLongForm,
                longFormContentDurationThreshold: 600,
                fastSwitchEnabled: true,
                bufferToKeep,
            },
            abr: {
                initialBitrate: { audio: -1, video: -1 },
                autoSwitchBitrate: { audio: true, video: true },
            }
        }
    })
}

/**
 * @param {import('./AudioList').Audio} audio
 * @param {Stream} stream
 * @param {Object} content
 * @param {import('./SubtitleList').Subtitle} subtitle
 * @returns {Promise<import('dashjs').MediaPlayerClass>}
 */
const createDashPlayer = async (audio, stream, content, subtitle) => {
    let url = null
    const startSec = Math.min(content.playhead.playhead, (content.duration_ms / 1000) - 30)
    /** @type {import('dashjs').MediaPlayerClass}*/
    const dashPlayer = dashjs.MediaPlayer().create()

    dashPlayer.extend('XHRLoader', XHRLoader)
    dashPlayer.addRequestInterceptor(modifierDashRequest(stream.profile))
    await setStreamingConfig(dashPlayer)
    url = stream.urls.find(val => val.locale === subtitle.locale)
    if (!url) {
        url = stream.urls.find(val => val.locale === 'off')
    }
    if (url) {
        url = url.url
    }
    dashPlayer.initialize()
    dashPlayer.setAutoPlay(false)
    dashPlayer.attachSource(url + '#t=' + Math.max(startSec, 0))
    dashPlayer.attachView(document.querySelector('video'))
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
        dashPlayer.setProtectionData(drmConfig)
        dashPlayer.registerLicenseRequestFilter(requestDashLicense(stream.profile))
        dashPlayer.registerLicenseResponseFilter(decodeLicense)
    }
    return dashPlayer
}

/**
 * Compute title for playing content
 * @param {Object} content
 * @returns {String}
 */
const computeTitle = (content) => {
    /** @type {Array<String>} */
    const title = []
    if (content) {
        title.push(content.title)
        if (content.type === 'episode') {
            let epNumber = null
            if (content.episode_metadata) {
                epNumber = content.episode_metadata.episode_number
            } else {
                epNumber = content.episode_number
            }
            if (epNumber) {
                title.push('-')
                title.push(epNumber)
            }
        }
        if (content.subTitle) {
            title.push('-')
            title.push(content.subTitle)
        }
    }
    return title.filter(e => e).join(' ')
}

/**
 * @param {Stream} stream
 * @returns {Promise<{intro: SkiptEvent, credits: SkiptEvent, preview: SkiptEvent, recap: SkiptEvent}>}
 */
const findSkipEvents = async (stream) => {
    /** @type {{intro: SkiptEvent, credits: SkiptEvent, preview: SkiptEvent, recap: SkiptEvent}} */
    let out = null
    try {
        const res = await fetchUtils.customFetch(stream.skipUrl)
        if (200 <= res.status && res.status < 300) {
            out = await res.json()
            if (out.recap) {
                out.recap.title = $L('Skip Recap')
            }
            if (out.intro) {
                out.intro.title = $L('Skip Intro')
            }
            if (out.credits) {
                out.credits.title = $L('Skip Credits')
            }
            if (out.preview) {
                out.preview.title = $L('Skip Preview')
            }
        }
    } catch (e) {
        logger.error(e)
    }
    return out
}

/**
 * @todo @fixme bug after playing video music "comet" of yoasobi
 */
const Player = ({ ...rest }) => {
    /** @type {[Boolean, Function]} */
    const [loading, setLoading] = useState(true)
    /** @type {Function} */
    const getLang = useGetLanguage()
    /** @type {import('crunchyroll-js-api').Types.Profile}*/
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
    /** @type {[{chunks: Array<{start: int, end: int, url: String}>}, Function]} */
    const [previews, setPreviews] = useState({ chunks: [] })
    /** @type {[String, Function]} */
    const [preview, setPreview] = useState(null)
    /** @type {[Event, Function]} */
    const [endEvent, setEndEvent] = useState(null)
    /** @type {{current:import('@enact/moonstone/VideoPlayer/VideoPlayer').VideoPlayerBase}} */
    const playerCompRef = useRef(null)
    /** @type {{current: import('dashjs').MediaPlayerClass}*/
    const playerRef = useRef(null)
    /** @type {Stream} */
    const emptyStream = useMemo(() => {
        return {
            id: null, urls: null, bif: null, token: null, session: null, audios: [],
            subtitles: [], profile: null, skipUrl: null,
        }
    }, [])
    /** @type {String} */
    const title = useMemo(() => computeTitle(content), [content])
    /** @type {[Stream, Function]} */
    const [stream, setStream] = useState(emptyStream)
    /** @type {[StreamSession, Function]} */
    const [session, setSession] = useState(null)
    /** @type {[Boolean, Function]} */
    const [isPaused, setIsPaused] = useState(null)
    /** @type {[Number, Function]} */
    const [jumpBy, setJumpBy] = useState(5)
    /** @type {[{intro: SkiptEvent, credits: SkiptEvent, preview: SkiptEvent, recap: SkiptEvent}, Function]} */
    const [skipEvents, setSkipEvents] = useState(null)
    /** @type {[SkiptEvent, Function]} */
    const [currentSkipEvent, setCurrentSkipEvent] = useState(null)
    /** @type {[String, Function]}  */
    const [message, setMessage] = useState('')

    /** @type {Function} */
    const selectAudio = useCallback((select) => {
        setAudio(audios[select])
    }, [setAudio, audios])

    /** @type {Function} */
    const selectSubtitle = useCallback((select) => {
        setSubtitle(stream.subtitles[select])
    }, [stream, setSubtitle])

    /** @type {Function} */
    const onScrub = useCallback(({ proportion }) => {
        if (previews.chunks.length > 0 && proportion && !isNaN(proportion)) {
            const chunk = previews.chunks[Math.floor(proportion * previews.chunks.length)]
            if (chunk) {
                setPreview(chunk.url)
            } else {
                setPreview(null)
            }
        }
    }, [previews, setPreview])

    /** @type {Function} */
    const onChangeEp = useCallback(async (changeEp) => {
        await updatePlayHead({ profile, content, playerCompRef })
        if (changeEp && changeEp.total > 0) {
            setAudio({})
            setPlayContent({ ...changeEp.data[0] })
        } else {
            back.doBack()
        }
    }, [playerCompRef, profile, content, setPlayContent, setAudio])

    /** @type {Function} */
    const onNextEp = useCallback((ev) => {
        ev.preventDefault()
        setLoading(true)
        playerRef.current.pause()
        findNextEp({ profile, content, step: +1 }).then(onChangeEp)
    }, [profile, content, onChangeEp, setLoading])

    /** @type {Function} */
    const onPrevEp = useCallback((ev) => {
        ev.preventDefault()
        playerRef.current.pause()
        if (playerRef.current.time() <= 30) {
            setLoading(true)
            findNextEp({ profile, content, step: -1 }).then(onChangeEp)
        } else {
            playerRef.current.seek(0)
            playerRef.current.play()
        }
    }, [profile, content, onChangeEp, setLoading])

    /** @type {Function} */
    const onEndVideo = useCallback((ev) => setEndEvent(ev), [setEndEvent])

    /** @type {Function} */
    const markAsWatched = useCallback(() => {
        api.discover.markAsWatched(profile, content.id)
            .then(() => console.log('watched'))
            .catch(console.error)
        onNextEp(new Event('fake'))
    }, [profile, content, onNextEp])

    /** @type {Function} */
    const onPlayPause = useCallback(() => {
        if (playerCompRef.current) {
            const { paused } = playerCompRef.current.getMediaState()
            setIsPaused(!paused)
        }
    }, [])

    /** @type {Function} */
    const onSkipBtnNavigate = useCallback(() => {
        if (!Spotlight.focus(rest.spotlightId + '_mediaControls')) {
            playerCompRef.current.showControls()
        }
    }, [rest.spotlightId])

    /** @type {Function} */
    const resetCurrentSkipEvent = useCallback(oldValue => {
        if (oldValue) {
            if (!Spotlight.focus(rest.spotlightId + '_mediaControls')) {
                const ctrlButton = document.querySelector('#media-controls').parentElement
                Spotlight.focus(ctrlButton.parentElement.nextElementSibling)
            }
        }
        return null
    }, [rest.spotlightId])

    /** @type {Function} */
    const onSkipEvent = useCallback(() => {
        if (currentSkipEvent.end - currentSkipEvent.start > 5) {
            playerRef.current.seek(currentSkipEvent.end - 5)
        } else {
            playerRef.current.seek(currentSkipEvent.end)
        }
        setCurrentSkipEvent(resetCurrentSkipEvent)
    }, [currentSkipEvent, resetCurrentSkipEvent])

    /** @type {Function} set skip button bottom */
    const onMediaControlShow = useCallback(({ available }) => {
        const skipDoc = document.querySelector('#skip-button')
        if (available) {
            const ctrlButton = document.querySelector('#media-controls').parentElement
            const posicionElementoB = ctrlButton.getBoundingClientRect().top
            skipDoc.style.bottom = `${window.innerHeight - posicionElementoB + 15}px`
        } else {
            skipDoc.style.bottom = '2.5rem'
            if (skipDoc.style.display === 'inline-block') {
                setTimeout(() => Spotlight.focus('#skip-button'), 100)
            }
        }
    }, [])

    /** @type {Function} */
    const onClosePopup = useCallback(() => setMessage(''), [setMessage])

    /** @type {Function} */
    const handleCrunchyError = useCallback((err) => {
        if (err instanceof CrunchyrollError) {
            if (err.httpStatus === 403) {
                setMessage(err.message + '. ' + $L('Maybe it is a premium content.'))
            } else if (err.httpStatus === 420 && err.message === 'TOO_MANY_ACTIVE_STREAMS') {
                setMessage($L('Too many active streams.'))
            } else {
                setMessage(err.message || err.httpStatusText)
            }
        } else if (err) {
            setMessage(err.message || `${err}`)
        } else {
            setMessage($L('An error occurred'))
        }
    }, [setMessage])

    useEffect(() => {  // find audios, it's needed to find stream url
        findAudio({ profile, audios }).then(setAudio)
    }, [profile, audios, setAudio, setEndEvent])

    useEffect(() => {  // find stream url
        if (audios.includes(audio)) {
            findStream({ profile, audios, audio, getLang, content })
                .then(setStream)
                .catch(handleCrunchyError)
        }
        return () => {
            setStream(lastStream => {
                if (lastStream.token) {
                    api.drm.deleteToken(profile, { episodeId: audio.guid, token: lastStream.token })
                }
                return emptyStream
            })
        }
    }, [profile, content, audios, audio, getLang, setStream, emptyStream, handleCrunchyError])

    useEffect(() => {  // find subtitles preview and skip events
        if (stream.urls) {
            findSubtitle(stream).then(setSubtitle)
            findPreviews(stream).then(setPreviews)
            findSkipEvents(stream).then(setSkipEvents)
        }
        return () => {
            setPreviews(lastPreview => {
                lastPreview.chunks.forEach(prev => window.URL.revokeObjectURL(prev))
                return { chunks: [], data: null }
            })
            setSubtitle(null)
            setSkipEvents(null)
        }
    }, [profile, stream, setSubtitle, setPreviews, setSkipEvents])

    useEffect(() => {  // attach subs
        let interval = null
        if (stream.urls && subtitle && stream.id === content.id) {
            interval = setInterval(() => {
                if (playerCompRef.current) {
                    clearInterval(interval)
                    createDashPlayer(audio, stream, content, subtitle).then(player => {
                        playerRef.current = player
                        playerRef.current.play()
                        setLoading(false)
                        setIsPaused(false)
                        /* how to log, add function and off events in clean up function
                        player.updateSettings({ debug: { logLevel: dashjs.Debug.LOG_LEVEL_DEBUG } })
                        player.on(dashjs.MediaPlayer.events.BUFFER_EMPTY, onBufferEmpty)
                        player.on(dashjs.MediaPlayer.events.BUFFER_LOADED, onBufferLoaded)
                        player.on(dashjs.MediaPlayer.events.FRAGMENT_LOADING_STARTED, onBufferLogging)
                        player.on(dashjs.MediaPlayer.events.FRAGMENT_LOADING_PROGRESS, onBufferLogging)
                        player.on(dashjs.MediaPlayer.events.FRAGMENT_LOADING_COMPLETED, onBufferLogging)
                        player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_REQUESTED, e => {
                            console.log('Cambio de calidad solicitado:', e.mediaType, 'nivel:', e.newQuality);
                        })
                        player.on(dashjs.MediaPlayer.events.FRAGMENT_LOADING_COMPLETED, e => {
                            console.log('Fragment:', e.mediaType, 'bytes:', e.bytesLength, 'tiempo(ms):',
                                e.request.finishTime - e.request.responseTime);
                        })
                        */
                    }).catch(handleCrunchyError)
                }
            }, 100)
        }
        return () => {
            setLoading(true)
            if (playerRef.current) {
                playerRef.current.pause()
                playerRef.current.destroy()
                playerRef.current = null
            }
            clearInterval(interval)
        }
    }, [profile, content, stream, audio, subtitle, setLoading, handleCrunchyError])

    useEffect(() => {  // set stream session
        if (stream === emptyStream) {
            setSession(null)
        } else {
            setSession(stream.session)
        }
    }, [stream, emptyStream])

    useEffect(() => {  // renew session keep alive stream
        let sessionTimeout = null
        if (session && stream.token) {
            sessionTimeout = setTimeout(() => {
                /** @type {{paused: boolean, currentTime: number}} */
                const state = playerCompRef.current.getMediaState()
                api.drm.keepAlive(stream.profile, {
                    episodeId: audio.guid,
                    token: stream.token,
                    playhead: state.currentTime,
                }).then(setSession).catch(e => {  // if fail retry in 2 second
                    logger.error('Error keep alive stream')
                    logger.error(e)
                    setSession(lastSession => {
                        const retries = (lastSession.retries || 0) + 1
                        let out = null
                        if (retries <= 12) {
                            out = {
                                ...lastSession,
                                renewSeconds: 18,
                                retries,
                            }
                        } else {
                            handleCrunchyError(e)
                        }
                        return out
                    })
                })

            }, (session.renewSeconds - 20) * 1000)
        }
        return () => clearTimeout(sessionTimeout)
    }, [profile, audio, stream, session, setSession, handleCrunchyError])

    useEffect(() => {  // plause / play watch
        let timeout = null
        if (session && isPaused) {
            timeout = setTimeout(() => {
                back.doBack()
            }, session.maximumPauseSeconds * 1000)
        }
        return () => { clearTimeout(timeout) }
    }, [session, isPaused])

    useEffect(() => {  // loop playHead
        if (!_PLAY_TEST_) {
            if (!loading && playerCompRef.current && content) {
                return updatePlayHeadLoop({ profile, content, playerCompRef })
            }
        }
    }, [profile, content, playerCompRef, loading])

    useEffect(() => {  // play next video
        let timeout = null
        if (endEvent) {
            timeout = setTimeout(() => {
                setEndEvent(null)
                if (!_PLAY_TEST_) {
                    onNextEp(endEvent)
                }
            }, 1000 * 2)
        }
        return () => clearTimeout(timeout)
    }, [endEvent, onNextEp, audios])

    useEffect(() => {  // incremental seek
        /** @type {Function} */
        const increaseSeek = () => { setJumpBy(Math.min(jumpBy << 1, 30)) }
        let timeout = null
        if (jumpBy <= 5) {
            // nothing
        } else if (jumpBy <= 10) {
            timeout = setTimeout(() => { setJumpBy(5) }, 2 * 1000)
        } else {
            timeout = setTimeout(() => { setJumpBy(5) }, 5 * 1000)
        }
        if (playerRef.current) {
            playerRef.current.on('playbackSeeking', increaseSeek)
        }
        return () => {
            if (playerRef.current) {
                playerRef.current.off('playbackSeeking', increaseSeek)
            }
            clearTimeout(timeout)
        }
    }, [loading, setJumpBy, jumpBy])

    useEffect(() => {  // skip events
        /** @type {Array<String>} */
        let availableEvents = []
        let timeout = null
        let timeloop = null
        /** @type {Function} */
        const processFn = update => {
            for (const type of availableEvents) {
                const gapSeconds = Math.min(15, skipEvents[type].end - skipEvents[type].start)
                const end = Math.min(skipEvents[type].start + gapSeconds, skipEvents[type].end)
                if (skipEvents[type].start <= update.time && update.time <= end && update.time > 0) {
                    setCurrentSkipEvent(oldValue => {
                        if (oldValue !== skipEvents[type]) {
                            playerCompRef.current.hideControls()
                            clearInterval(timeloop)
                            timeloop = setInterval(() => {
                                if (Spotlight.focus('#skip-button')) {
                                    clearInterval(timeloop)
                                }
                            }, 100)
                            clearTimeout(timeout)
                            timeout = setTimeout(() => setCurrentSkipEvent(resetCurrentSkipEvent), 1000 * gapSeconds)
                        }
                        return skipEvents[type]
                    })

                }
            }
        }
        if (!loading && skipEvents && playerRef.current) {
            availableEvents = ['recap', 'intro', 'credits', 'preview'].filter(type => skipEvents[type])
            playerRef.current.on('playbackTimeUpdated', processFn)
        }
        return () => {
            if (playerRef.current) {
                playerRef.current.off('playbackTimeUpdated', processFn)
            }
            clearTimeout(timeout)
            clearInterval(timeloop)
            setCurrentSkipEvent(resetCurrentSkipEvent)
        }
    }, [loading, skipEvents, resetCurrentSkipEvent])

    return (
        <div className={rest.className}>
            <VideoPlayer {...rest}
                title={title}
                poster={poster}
                thumbnailSrc={preview}
                onScrub={onScrub}
                onJumpBackward={onPrevEp}
                onJumpForward={onNextEp}
                onEnded={onEndVideo}
                onPause={onPlayPause}
                onPlay={onPlayPause}
                jumpBy={jumpBy}
                loading={loading}
                ref={playerCompRef}
                onControlsAvailable={onMediaControlShow}
                noAutoPlay>
                <video id={content.id}>
                    <source src={emptyVideo} />
                </video>
                <MediaControls id="media-controls">
                    <leftComponents>
                        <ContentInfo content={content} />
                        {['episode'].includes(content.type) && (<>
                            <IconButton
                                backgroundOpacity="lightTranslucent"
                                onClick={markAsWatched}
                                tooltipText={$L('Mark as watched')}>
                                checkselection
                            </IconButton>
                            <Rating profile={profile} content={content} />

                        </>)}
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
            <Button id="skip-button"
                style={{
                    position: 'absolute',
                    right: '2.5rem',
                    bottom: '2.5rem',
                    display: currentSkipEvent ? 'inline-block' : 'none',
                }}
                onClick={onSkipEvent}
                spotlightDisabled={!currentSkipEvent}
                onSpotlightDown={onSkipBtnNavigate}
                onSpotlightLeft={onSkipBtnNavigate}
                onSpotlightRight={onSkipBtnNavigate}
                onSpotlightUp={onSkipBtnNavigate}>
                {currentSkipEvent && currentSkipEvent.title}
            </Button>
            <PopupMessage show={!!message} type='error' onClose={onClosePopup}>
                {message}
            </PopupMessage>
        </div>
    )
}

export default Player
