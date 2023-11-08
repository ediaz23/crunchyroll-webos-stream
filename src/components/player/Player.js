import Hls from 'hls.js'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import VideoPlayer, { MediaControls, Video } from '@enact/moonstone/VideoPlayer'
import { useRecoilValue, useRecoilState } from 'recoil'
import SubtitlesOctopus from 'libass-wasm'

import AudioSelect from './AudioSelect'
import SubtitleSelect from './SubtitleSelect'
import Rating from './Rating'
import ContactMe from '../login/ContactMe'
import { currentProfileState, playContentState } from '../../recoilConfig'
import { useGetLanguage } from '../../hooks/language'
import logger from '../../logger'
import api from '../../api'
import emptyVideo from '../../../resources/empty.mp4'
import back from '../../back'


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
 @returns {Promise}
 */
const updatePlayHead = async ({ profile, content, videoCompRef }) => {
    /** @type {{paused: boolean, currentTime: number}} */
    const state = videoCompRef.current.getMediaState()
    content.playhead.playhead = Math.floor(state.currentTime)
    return api.content.savePlayhead(profile, {
        contentId: content.id,
        playhead: Math.floor(state.currentTime),
    })
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
const searchPlayHead = async ({ profile, content }) => {
    const { data } = await api.content.getPlayHeads(profile, { contentIds: [content.id] })
    if (data && data.length > 0) {
        content.playhead = data[0]
    } else {
        content.playhead = {
            playhead: 0,
            fully_watched: false,
        }
    }
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
        url: data[0].multitrack_adaptive_hls_v2[''].url,
        bif: meta.bifs,
        audios: audios,
        subtitles: [{ locale: 'off', }, ...Object.values(meta.subtitles)].map(subtitle => {
            return { ...subtitle, title: getLang(subtitle.locale) }
        })
    }
    return out
}

/**
 * @param {{
    bif: String,
  }}
 * @returns {Promise<Array<String>>}
 */
const searchPreviews = async ({ bif }) => {
    let images = []
    try {
        /** @type {Response} */
        const res = await fetch(bif)
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
const searchPoster = ({ content }) => {
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

/**
 * Create hsl object
 * @returns {import('hls.js').default}
 */
const createHls = () => {
    return new Hls({
        progressive: true,
        //        autoStartLoad: false,
        fetchSetup: (context, initParams) => {
            initParams.headers.append('is-front-hls', 'true')
            return new Request(context.url, initParams)
        }
    })
}

/**
 * @todo manejar los errores
 * ver que hacer con rej
 * puede tener un loop infito
 */
const onHlsError = (hls) => {
    return (_event, data) => {
        const video = document.querySelector('video')
        //        logger.error(data)
        switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
                logger.error(`hsl: NETWORK_ERROR ${data.details}`)
                if (data.response.code === 403) {
                    hls.destroy()
                } else {
                    if (data.details === 'manifestLoadError') {
                        // showError('Episode cannot be played because of CORS error. You must use a proxy.')
                        hls.destroy()
                    } if (data.details === 'fragLoadError') {
                        hls.destroy()
                    } else {
                        hls.startLoad()
                    }
                }
                break
            case Hls.ErrorTypes.MEDIA_ERROR:
                logger.error('hsl: MEDIA_ERROR trying recovery...')
                hls.recoverMediaError()
                video.play().catch(logger.error)
                break
            default:
                logger.error(`hsl: falta ${data.details}`)
                hls.destroy()
                break
        }
    }
}


/**
 * @todo chagen subs and audio is not working well
 * @todo cambiar subs y audios
 */
const Player = ({ ...rest }) => {
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
        return content.versions.map(a => {
            return { ...a, title: getLang(a.audio_locale) }
        })
    }, [content, getLang])
    const poster = useMemo(() => searchPoster({ content }), [content])
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
    /** @type {{current: import('hls.js').default}*/
    const hslRef = useRef(null)
    /** @type {{current: import('libass-wasm')}*/
    const octopusRes = useRef(null)
    const emptyStream = useMemo(() => {
        return { url: null, bif: null, audios: [], subtitles: [] }
    }, [])
    /** @type {[Stream, Function]} */
    const [stream, setStream] = useState(emptyStream)

    /** @type {Function} */
    const cleanStates = useCallback(() => {
        hslRef.current.destroy()
        hslRef.current = createHls()
        setAudio({})
        setSubtitle({})
        setLoading(true)
        setPreviews([])
        setPreview({})
        setStream(emptyStream)
    }, [setAudio, setSubtitle, setLoading, setPreviews, setPreview, hslRef,
        setStream, emptyStream])

    /** @type {Function} */
    const cleanOctopus = () => {
        if (octopusRes.current) {
            octopusRes.current.dispose()
            octopusRes.current = null
        }
    }

    /** @type {Function} */
    const selectAudio = useCallback((select) => {
        videoCompRef.current.pause()
        cleanStates()
        setAudio(audios[select])
    }, [videoCompRef, cleanStates, setAudio, audios])

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
            cleanStates()
            setPlayContent(changeEp.data[0])
        } else {
            back.popHistory().doBack()
        }
    }, [videoCompRef, profile, content, setPlayContent, cleanStates])

    /** @type {Function} */
    const onNextEp = useCallback(async (ev) => {
        ev.preventDefault()
        const nextEp = await api.discover.getNext(profile, { contentId: content.id })
        await onChangeEp(nextEp)
    }, [profile, content, onChangeEp])

    /** @type {Function} */
    const onPrevEp = useCallback(async (ev) => {
        ev.preventDefault()
        const prevEp = await api.discover.getPrev(profile, { contentId: content.id })
        await onChangeEp(prevEp)
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
        hslRef.current = createHls()
        return () => {
            hslRef.current.destroy()
            cleanOctopus()
        }
    }, [])

    useEffect(() => {
        if (videoCompRef.current) {
            updatePlayHeadLoop({ profile, content, videoCompRef })
        }
    }, [profile, content, videoCompRef])

    useEffect(() => {
        setAudio(searchAudio({ profile, audios }))
    }, [profile, audios, setAudio])

    useEffect(() => {
        if (audios.includes(audio)) {
            searchPlayHead({ profile, content })
                .then(() => searchStream({ profile, audios, audio, getLang }))
                .then(setStream)
        }
    }, [profile, content, audios, audio, getLang, setStream])

    useEffect(() => {  // create hsl
        if (stream.url && loading) {
            /**
             * @todo que hacer con el error
             */
            Promise.all([
                new Promise((res, rej) => {
                    // for test
                    //                    hslRef.current.loadSource('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8')
                    hslRef.current.loadSource(stream.url)
                    hslRef.current.config.capLevelToPlayerSize = true
                    hslRef.current.on(Hls.Events.ERROR, onHlsError(hslRef.current, rej))
                    hslRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
                        /**@todo quitar */
                        //                        const videoNode = document.querySelector('video')
                        //                        videoNode.currentTime = content.playhead.playhead
                        res()
                    })
                }),
                setSubtitle(searchSubtitle({ profile, ...stream })),
                searchPreviews(stream).then(setPreviews)
            ]).then(() => {
                setLoading(false)
            }).catch(logger.error)
        }
    }, [setLoading, stream, loading, setSubtitle, profile, setPreviews, setPlayHead])

    useEffect(() => {  // attach video to dom
        if (!loading && videoCompRef.current) {
            hslRef.current.attachMedia(document.querySelector('video'))
        }
    }, [loading, videoCompRef])

    useEffect(() => {  // attach subs
        if (content && !loading && videoCompRef.current && subtitle) {
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
    }, [loading, videoCompRef, subtitle, content])

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
                        <ContactMe origin='/profiles/home/player' />
                    </rightComponents>
                </MediaControls>
            </VideoPlayer>
        </div>
    )
}

export default Player
