
import { useEffect, useRef } from 'react'
import Jassub from 'jassub-webos5'
import { availableFonts } from '../../hooks/fonts'
import * as fetchUtils from '../../hooks/customFetch'
import { _LOCALHOST_SERVER_ } from '../../const'
import utils from '../../utils'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

const JassubWorker = new URL('jassub-webos5/modern/jassub.worker.min.js', import.meta.url)
const JassubWorkerWasm = new URL('jassub-webos5/modern/worker.min.wasm', import.meta.url)
const defaultFont = new URL('jassub-webos5/default-font', import.meta.url)

/**
 * @param {import('jassub-webos5').default} jassub
 */
const loadFonts = async (jassub) => {
    let fallbackFont = 'liberation sans'
    const fontMap = {}

    if (utils.isTv()) {
        const deviceInfo = await new Promise(res => webOS.deviceInfo(res))
        const ramInGB = utils.parseRamSizeInGB(deviceInfo.ddrSize || '1G')
        const liteFonts = [
            'lato-regular.ttf',
            'lato-bold.ttf',
            'lato-black.ttf',
            'robotomono-regular.ttf'
        ]

        fontMap['liberation sans'] = defaultFont.pathname.split('/').filter(Boolean).slice(1).join('/')
        for (const entry of Object.values(availableFonts)) {
            if (ramInGB <= 0.8) {
                if (liteFonts.includes(entry.name)) {
                    fontMap[entry.name] = entry.url
                }
            } else {
                fontMap[entry.name] = entry.url
            }
        }
    } else {
        fontMap['liberation sans'] = defaultFont.href
        for (const entry of Object.values(availableFonts)) {
            fontMap[entry.name] = `${_LOCALHOST_SERVER_}/fonts?url=${encodeURIComponent(entry.url)}`
        }
    }
    for (const [name, url] of Object.entries(fontMap)) {
        jassub.addFont(
            new Uint8Array(
                await (utils.isTv()
                    ? utils.loadData(url, true)
                    : (await fetch(url)).arrayBuffer()
                )
            )
        )
        if (name === 'lato-regular.ttf') {
            fallbackFont = 'lato'
        }
    }
    jassub.setDefaultFont(fallbackFont)
}

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
                const subContent = await subRes.text()
                const video = document.querySelector('video')
                const { libassMemoryLimit, libassGlyphLimit } = await getMemoryLimits()

                return new Promise((res, rej) => {
                    jassubRef.current = new Jassub({
                        video,
                        subContent,
                        libassMemoryLimit,
                        libassGlyphLimit,
                        blendMode: 'wasm',
                        workerUrl: JassubWorker.href,
                        wasmUrl: JassubWorkerWasm.href,
                    })
                    jassubRef.current.addEventListener('ready', () => res(jassubRef.current))
                    jassubRef.current.addEventListener('error', rej)
                })
            }
            playPause()
            loadSub().then(loadFonts).then(playPause).catch(onError)
        }

        return () => {
            if (jassubRef.current?.free) {
                jassubRef.current.free()
            }
        }
    }, [appConfigRef, subtitle, playPause, onError])
}
