
import { useEffect, useRef } from 'react'
import Jassub from 'jassub-webos5/legacy'
import { availableFonts } from '../../hooks/fonts'
import * as fetchUtils from '../../hooks/customFetch'
import { _LOCALHOST_SERVER_ } from '../../const'
import utils from '../../utils'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

const JassubWorker = new URL('jassub-webos5/legacy/jassub.worker.min.js', import.meta.url)
const JassubWorkerWasm = new URL('jassub-webos5/legacy/worker.min.js', import.meta.url)

const getFonts = async () => {
    let fonts = [], fontNames = [], libassMemoryLimit = 24, libassGlyphLimit = 2
    const fontMap = {
        'liberation sans': new URL('jassub-webos5/default-font', import.meta.url),
        'museo sans': new URL('@enact/moonstone/fonts/MuseoSans/MuseoSans-Medium.ttf', import.meta.url),
    }

    if (utils.isTv()) {
        for (const name in fontMap) {
            fontMap[name] = fontMap[name].pathname.split('/').filter(Boolean).slice(1).join('/')
        }
        for (const entry of Object.values(availableFonts)) {
            fontMap[entry.name] = entry.url
        }

        const deviceInfo = await new Promise(res => webOS.deviceInfo(res))
        const ramInGB = utils.parseRamSizeInGB(deviceInfo.ddrSize || '1G')

        if (ramInGB <= 0.8) {
            for (const name of fontMap) {
                if (!['lato-regular.ttf', 'liberationsans-regular'].includes(name)) {
                    delete fontMap[name]
                }
            }
            libassMemoryLimit = 8
            libassGlyphLimit = 1
        }
    } else {
        for (const name in fontMap) {
            fontMap[name] = fontMap[name].href
        }
        for (const entry of Object.values(availableFonts)) {
            fontMap[entry.name] = `${_LOCALHOST_SERVER_}/fonts?url=${encodeURIComponent(entry.url)}`
        }
    }
    fontNames = Object.keys(fontMap)
    fonts = (await Promise.all(utils.isTv()
        ? fontNames.map(name => utils.loadData(fontMap[name], true))
        : fontNames.map(name => fetch(fontMap[name]).then(res => res.arrayBuffer()))
    )).map(f => new Uint8Array(f))
    const fallbackFont = fontNames.includes('lato-regular.ttf') ? 'lato' : 'liberation sans'
    return { fonts, fallbackFont, libassMemoryLimit, libassGlyphLimit }
}

/**
 * @param {Object} obj
 * @param {import('./SubtitleList').Subtitle} obj.subtitle
 * @param {Function} obj.playPause
 * @param {Function} obj.onError
 */
const JassubOverlay = ({ subtitle, playPause, onError }) => {
    const canvasRef = useRef(null)
    /** @type {{current: import('jassub-webos5').default}*/
    const jassubRef = useRef(null)

    useEffect(() => {
        if (subtitle && subtitle.locale !== 'off' && canvasRef.current) {
            const loadSub = async () => {
                const subRes = await fetchUtils.customFetch(subtitle.url)
                const subContent = await subRes.text()
                const video = document.querySelector('video')
                const { width, height } = video.getBoundingClientRect()
                const fontConfig = await getFonts()

                canvasRef.current.width = Math.floor(width);
                canvasRef.current.height = Math.floor(height);
                canvasRef.current.style.width = `${width}px`;
                canvasRef.current.style.height = `${height}px`;
                return new Promise((res, rej) => {
                    jassubRef.current = new Jassub({
                        video,
                        canvas: canvasRef.current,
                        subContent,
                        ...fontConfig,
                        workerUrl: JassubWorker.href,
                        legacyWasmUrl: JassubWorkerWasm.href,
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
        };
    }, [subtitle, playPause, onError])

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <canvas
                ref={canvasRef}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                }}
            />
        </div>
    )
}

export default JassubOverlay
