import Hls from 'hls.js'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import VideoPlayer, { MediaControls, Video } from '@enact/moonstone/VideoPlayer'
import { useRecoilValue } from 'recoil'

import AudioSelect from './AudioSelect'
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
 * @property {Array<import('./SubtitleSelect').Subtitle>} subtitles
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
    }, 1000 * 5) // every 15 sec
    return () => clearInterval(interval)
}


/**
 * @param {{videoRef: {current: HTMLVideoElement}}}
 * @returns {Function}
 */
const searchVideoTag = ({ videoRef }) => {
    const interval = setInterval(() => {
        videoRef.current = document.querySelector('video')
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
        subtitles: Object.values(meta.subtitles).map(subtitle => {
            return { ...subtitle, title: getLang(subtitle.locale) }
        })
    }
    return out
}

/**
 * @todo manejo de errores
 * @param {{stream: Stream}}
 * @returns {import('hls.js').default}
 */
/*
const createHls = ({ stream }) => {
    const hls = new Hls()
    hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
            switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    // Manejar errores de red
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    // Manejar errores de medios
                    break;
                default:
                    // Manejar otros tipos de errores
                    break;
            }
        }
    })
    return hls
}
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
    /** @type {[Boolean, Function]} */
    const [loading, setLoading] = useState(true)
    /** @type {{current: HTMLVideoElement}} */
    const videoRef = useRef(null)
    /** @type {{current:import('@enact/moonstone/VideoPlayer/VideoPlayer').VideoPlayerBase}} */
    const videoCompRef = useRef(null)
    /** @type {{current: import('hls.js').default}*/
    const hslRef = useRef(null)
    /** @type {[Stream, Function]} */
    const [stream, setStream] = useState({ url: null, bif: null, audios: [], subtitles: [] })

    const selectAudio = useCallback((select) => {
        setStream({ ...stream, url: null })
        setLoading(true)
        videoRef.current.pause()
        hslRef.current.destroy()
        hslRef.current = new Hls()
        setAudio(audios[select])
    }, [videoRef, hslRef, setStream, setLoading, setAudio, audios, stream])


    useEffect(() => {
        hslRef.current = new Hls()
        return () => hslRef.current.destroy()
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
            /** @todo manejar errores */
            hslRef.current.on(Hls.Events.ERROR, console.error)
            hslRef.current.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false))
        }
    }, [setLoading, stream, loading, videoRef])

    useEffect(() => {  // attach video to dom
        if (!loading && videoRef.current && videoCompRef.current) {
            hslRef.current.attachMedia(videoRef.current)
            //            videoRef.current.play()
        }
    }, [videoRef, videoCompRef, loading])
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
                    <rightComponents>
                        {audios.length > 0 &&
                            <AudioSelect audios={audios} audio={audio} selectAudio={selectAudio} />
                        }
                    </rightComponents>
                </MediaControls>
            </VideoPlayer>
        </div>
    )
}

export default Player
