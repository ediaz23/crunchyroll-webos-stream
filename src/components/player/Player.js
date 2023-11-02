import Hls from 'hls.js'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import VideoPlayer, { MediaControls, Video } from '@enact/moonstone/VideoPlayer'
import { useRecoilValue } from 'recoil'
import SubtitlesOctopus from 'libass-wasm'

import AudioSelect from './AudioSelect'
import SubtitleSelect from './SubtitleSelect'
import Rating from './Rating'
import { currentProfileState, playContentState } from '../../recoilConfig'
import { useGetLanguage } from '../../hooks/language'
import logger from '../../logger'
import api from '../../api'


/**
 * @typedef Stream
 * @type {Object}
 * @property {String} url
 * @property {String} bif
 * @property {Array<import('./AudioList').Audio>} audios
 * @property {Array<import('./SubtitleList').Subtitle>} subtitles
 */

/**
 * @param {{
    profile: import('crunchyroll-js-api/src/types').Profile,
    content: Object,
    videoCompRef: {current:import('@enact/moonstone/VideoPlayer/VideoPlayer').VideoPlayerBase}
 }}
 * @returns {import('./AudioList').Audio}
 */
const updatePlayHead = ({ profile, content, videoCompRef }) => {
    const interval = setInterval(() => {
        if (videoCompRef.current) {
            /** @type {{paused: boolean, currentTime: number}} */
            const state = videoCompRef.current.getMediaState()
            if (!state.paused) {
                api.content.savePlayhead(profile, {
                    contentId: content.id,
                    playhead: Math.floor(state.currentTime),
                }).catch(logger.error)
            }
        }
    }, 1000 * 15) // every 15 sec
    return () => clearInterval(interval)
}


/**
 * @param {{videoRef: {current: HTMLVideoElement}}}
 * @returns {Function}
 */
const searchVideoTag = ({ videoRef }) => {
    const interval = setInterval(() => {
        const video = document.querySelector('video')
        if (video !== videoRef.current) {
            console.log('change tag')
        }
        videoRef.current = video
        if (videoRef.current) {
            clearInterval(interval)
        }
    }, 100)
    return () => clearInterval(interval)
}

/**
 * @param {{
    profile: import('crunchyroll-js-api/src/types').Profile,
    audios: Array<import('./AudioList').Audio>
 }}
 * @returns {import('./AudioList').Audio}
 */
const searchAudio = ({ profile, audios }) => {
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
const searchSubtitle = ({ profile, subtitles }) => {
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
const searchStream = async ({ profile, audios, audio, getLang }) => {
    const { data, meta } = await api.cms.getStreams(profile, { contentId: audio.media_guid })
    /** @type {Stream} */
    const out = {
        url: data[0].adaptive_hls[''].url,
        bif: meta.bifs,
        audios: audios,
        subtitles: [{ locale: 'off', }, ...Object.values(meta.subtitles)].map(subtitle => {
            return { ...subtitle, title: getLang(subtitle.locale) }
        })
    }
    return out
}

/**
 * @todo manejar errores
 * @param {{
    subUrl: String,
    videoRef: {current: HTMLVideoElement}
 }}
 * @returns {import('libass-wasm')}
 */
const createOptapus = ({ subUrl, videoRef }) => {
    console.log('createOptapus')
    const octopusWorkerUrl = new URL('libass-wasm/dist/js/subtitles-octopus-worker.js', import.meta.url)
    const octopuslegacyWorkerUrl = new URL('libass-wasm/dist/js/subtitles-octopus-worker-legacy.js', import.meta.url)
    const testFont = new URL('../../../resources/default.woff2', import.meta.url)
    const _wasm = new URL('libass-wasm/dist/js/subtitles-octopus-worker.wasm', import.meta.url)
    return new SubtitlesOctopus({
        video: videoRef.current,
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

/**
 * @todo manejar los errores
 */
const onHlsError = (hls) => {
    return (_event, data) => {
        if (!data.fatal) {
            return
        }
        switch (data.type) {
            case Hls.ErrorTypes.OTHER_ERROR:
                hls.startLoad()
                break
            case Hls.ErrorTypes.NETWORK_ERROR:
                if (data.details === 'manifestLoadError') {
                    //                    showError('Episode cannot be played because of CORS error. You must use a proxy.')
                } else {
                    hls.startLoad()
                }
                break
            case Hls.ErrorTypes.MEDIA_ERROR:
                logger.info('Media error: trying recovery...')
                hls.recoverMediaError()
                break
            default:
                logger.error('Media cannot be recovered: ' + data.details)
                hls.destroy()
                break
        }
    }
}


/**
 * @todo chagen subs and audio is not working well
 */
const Player = ({ ...rest }) => {
    /** @type {Function} */
    const getLang = useGetLanguage()
    /** @type {import('crunchyroll-js-api/src/types').Profile}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {Object} */
    const playContent = useRecoilValue(playContentState)
    /** @type {Object} */
    const content = useMemo(() => Object.assign({}, playContent, playContent.episode_metadata || {}), [playContent])
    /** @type {Array<import('./AudioList').Audio} */
    const audios = useMemo(() => content.versions.map(a => {
        return { ...a, title: getLang(a.audio_locale) }
    }), [content, getLang])
    /** @type {[import('./AudioList').Audio, Function]} */
    const [audio, setAudio] = useState(null)
    /** @type {[import('./SubtitleList').Subtitle, Function]} */
    const [subtitle, setSubtitle] = useState(null)
    /** @type {[Boolean, Function]} */
    const [loading, setLoading] = useState(true)
    /** @type {{current: HTMLVideoElement}} */
    const videoRef = useRef(null)
    /** @type {{current:import('@enact/moonstone/VideoPlayer/VideoPlayer').VideoPlayerBase}} */
    const videoCompRef = useRef(null)
    /** @type {{current: import('hls.js').default}*/
    const hslRef = useRef(null)
    /** @type {{current: import('libass-wasm')}*/
    const octopusRes = useRef(null)
    /** @type {[Stream, Function]} */
    const [stream, setStream] = useState({ url: null, bif: null, audios: [], subtitles: [] })
    /** @type {Function} */
    const cleanOctopus = () => {
        if (octopusRes.current) {
            octopusRes.current.dispose()
            octopusRes.current = null
        }
    }

    const selectAudio = useCallback((select) => {
        setStream({ ...stream, url: null })
        setLoading(true)
        videoRef.current.pause()
        cleanOctopus()
        hslRef.current.destroy()
        hslRef.current = new Hls()
        setAudio(audios[select])
    }, [videoRef, hslRef, setStream, setLoading, setAudio, audios, stream])

    const selectSubtitle = useCallback((select) => {
        setSubtitle(stream.subtitles[select])
    }, [stream, setSubtitle])

    useEffect(() => {
        hslRef.current = new Hls()
        return () => {
            hslRef.current.destroy()
            cleanOctopus()
        }
    }, [])
    useEffect(() => searchVideoTag({ videoRef }), [audio, content, videoCompRef])
    useEffect(() => updatePlayHead({ profile, content, videoCompRef }), [profile, content, videoCompRef])
    useEffect(() => setAudio(searchAudio({ profile, audios })), [audios, profile])
    useEffect(() => {
        if (audio) {
            searchStream({ profile, audios, audio, getLang }).then(setStream)
        }
    }, [profile, audios, audio, getLang])

    useEffect(() => {  // create hsl
        if (stream.url && loading && videoRef) {
            hslRef.current.loadSource(stream.url)
            hslRef.current.config.capLevelToPlayerSize = true
            hslRef.current.on(Hls.Events.ERROR, onHlsError(hslRef.current))
            hslRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
                setSubtitle(searchSubtitle({ profile, ...stream }))
                setLoading(false)
            })
        }
    }, [setLoading, stream, loading, videoRef, setSubtitle, profile])

    useEffect(() => {  // attach video to dom
        if (!loading && videoRef.current && videoCompRef.current) {
            hslRef.current.attachMedia(videoRef.current)
            // videoRef.current.play()
        }
    }, [videoRef, videoCompRef, loading, subtitle])

    useEffect(() => {  // attach subs
        if (!loading && videoRef.current) {
            if (subtitle) {
                if (subtitle.locale === 'off') {
                    if (octopusRes.current) {
                        octopusRes.current.freeTrack()
                    }
                } else {
                    if (octopusRes.current) {
                        octopusRes.current.setTrackByUrl(subtitle.url)
                    } else {
                        octopusRes.current = createOptapus({ subUrl: subtitle.url, videoRef })
                    }
                }
            }
        }
    }, [loading, videoRef, subtitle])

    return (
        <div className={rest.className}>
            <VideoPlayer {...rest}
                loading={loading}
                ref={videoCompRef}
                noAutoPlay>
                {stream.url &&
                    <Video id={content.id}>
                        <source src={stream.url} />
                    </Video>
                }
                <MediaControls>
                    <leftComponents>
                        <Rating profile={profile} content={content} />
                    </leftComponents>
                    <rightComponents>
                        {stream.subtitles.length > 1 &&
                            <SubtitleSelect subtitles={stream.subtitles}
                                subtitle={subtitle}
                                selectSubtitle={selectSubtitle} />
                        }
                        {stream.audios.length > 0 &&
                            <AudioSelect audios={stream.audios}
                                audio={audio}
                                selectAudio={selectAudio} />
                        }
                    </rightComponents>
                </MediaControls>
            </VideoPlayer>
        </div>
    )
}

export default Player
