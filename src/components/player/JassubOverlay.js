
import { useEffect, useRef } from 'react'
import Jassub from 'jassub-webos5/modern/jassub.debug.js'
import * as fetchUtils from '../../hooks/customFetch'

const JassubWorker = new URL('jassub-webos5/modern/jassub.worker.debug.js', import.meta.url)
const JassubWorkerWasm = new URL('jassub-webos5/modern/worker.debug.wasm', import.meta.url)
const fontDefaultUrl = new URL('jassub-webos5/default-font', import.meta.url)


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

                canvasRef.current.width = Math.floor(width);
                canvasRef.current.height = Math.floor(height);
                canvasRef.current.style.width = `${width}px`;
                canvasRef.current.style.height = `${height}px`;

                return new Promise((res, rej) => {
                    jassubRef.current = new Jassub({
                        video,
                        canvas: canvasRef.current,
                        subContent,
                        availableFonts: { 'liberation sans': fontDefaultUrl.href },
                        fallbackFont: 'liberation sans',
                        workerUrl: JassubWorker.href,
                        wasmUrl: JassubWorkerWasm.href,
                        debug: true,
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
