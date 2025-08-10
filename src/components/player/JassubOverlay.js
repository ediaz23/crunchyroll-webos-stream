
import { useEffect, useRef } from 'react'
import Jassub from 'jassub-webos5/legacy'
import { getFonts } from '../../hooks/fonts'
import * as fetchUtils from '../../hooks/customFetch'
import utils from '../../utils'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

const JassubWorker = new URL('jassub-webos5/legacy/jassub.worker.min.js', import.meta.url)
const JassubWorkerWasm = new URL('jassub-webos5/legacy/worker.min.js', import.meta.url)

const getMemoryLimits = async () => {
    let libassMemoryLimit = 24, libassGlyphLimit = 2

    if (utils.isTv()) {
        const deviceInfo = await new Promise(res => webOS.deviceInfo(res))
        const ramInGB = utils.parseRamSizeInGB(deviceInfo.ddrSize || '1G')

        if (ramInGB <= 0.8) {
            libassMemoryLimit = 8
            libassGlyphLimit = 1
        }
    }

    return { libassMemoryLimit, libassGlyphLimit }
}

/**
 * @param {Object} obj
 * @param {import('react').MutableRefObject<import('../../api/config').AppConfig>} obj.appConfigRef
 * @param {import('./SubtitleList').Subtitle} obj.subtitle
 * @param {Function} obj.playPause
 * @param {Function} obj.onError
 */
export const useJassub = ({ appConfigRef, subtitle, playPause, onError }) => {
    /** @type {{current: import('jassub-webos5').default}*/
    const jassubRef = useRef(null)

    useEffect(() => {
        if (appConfigRef.current.subtitle === 'softsub' && subtitle && subtitle.locale !== 'off') {
            const loadSub = async () => {
                const subRes = await fetchUtils.customFetch(subtitle.url)
                const decoder = new window.TextDecoder('utf-8', { fatal: false })
                const subContent = decoder.decode(new Uint8Array(await subRes.arrayBuffer()))
                const video = document.querySelector('video')
                const { libassMemoryLimit, libassGlyphLimit } = await getMemoryLimits()
                const fonts = await getFonts()

                return new Promise((res, rej) => {
                    jassubRef.current = new Jassub({
                        video,
                        subContent,
                        fonts: fonts.data,
                        fallbackFont: fonts.defaultFont,
                        libassMemoryLimit,
                        libassGlyphLimit,
                        blendMode: 'js',
                        workerUrl: JassubWorker.href,
                        legacyWasmUrl: JassubWorkerWasm.href,
                        dropAllBlur: true,
                    })
                    jassubRef.current.addEventListener('ready', res)
                    jassubRef.current.addEventListener('error', rej)
                })
            }
            playPause()
            loadSub().then(playPause).catch(onError)
        }

        return () => {
            if (jassubRef.current?.free) {
                jassubRef.current.free()
            }
        }
    }, [appConfigRef, subtitle, playPause, onError])
}
