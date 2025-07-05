/* global Worker */

import { useEffect, useRef } from 'react'
import Jassub from '../../../libs/jassub/jassub.js'
import * as fetchUtils from '../../hooks/customFetch'

const AssCleanerWorker = new URL('../../workers/assCleaner.worker.js', import.meta.url)
const JassubWorker = new URL('../../../libs/jassub/jassub-worker.js', import.meta.url)
const JassubWorkerWasm = new URL('jassub/dist/jassub-worker.wasm', import.meta.url)
const JassubWorkerLegacy = new URL('jassub/dist/jassub-worker.wasm.js', import.meta.url)

/**
 * @param {String} subContent
 * @returns {Promise<String>}
 */
const clearAss = async (subContent) => new Promise((res, rej) => {
    const worker = new Worker(AssCleanerWorker)
    worker.onmessage = (e) => {
        res(e.data)
        worker.terminate()
    }
    worker.onerror = rej
    worker.postMessage(subContent)
})

/**
 * @param {Object} obj
 * @param {import('./SubtitleList').Subtitle} obj.subtitle
 * @param {Function} obj.playPause
 * @param {Function} obj.onError
 */
const JassubOverlay = ({ subtitle, playPause, onError }) => {
    const canvasRef = useRef(null)
    /** @type {{current: import('jassub').default}*/
    const jassubRef = useRef(null)

    useEffect(() => {
        if (subtitle && subtitle.locale !== 'off' && canvasRef.current) {
            const loadSub = async () => {
                const subRes = await fetchUtils.customFetch(subtitle.url)
                const subContent = await clearAss(await subRes.text())
                const video = document.querySelector('video')
                const { width, height } = video.getBoundingClientRect()

                canvasRef.current.width = Math.floor(width);
                canvasRef.current.height = Math.floor(height);
                canvasRef.current.style.width = `${width}px`;
                canvasRef.current.style.height = `${height}px`;

                return new Promise(res => {
                    jassubRef.current = new Jassub({
                        video,
                        canvas: canvasRef.current,
                        subContent,
                        fonts: [
                            new URL('jassub/dist/default.woff2', import.meta.url),
                        ].map(u => u.href),
                        /*
                        blendMode: 'lossy',  // Optimización
                        prescaleFactor: 0.5,
                        dropAllAnimations: true,
                        */
                        workerUrl: JassubWorker.href,
                        wasmUrl: JassubWorkerWasm.href,
                        legacyWasmUrl: JassubWorkerLegacy.href,
                        debug: true,
                    })
                    jassubRef.current.addEventListener('ready', res)
                    jassubRef.current.addEventListener('error', err => {
                        console.error(err, err?.stack)
                        onError(err)
                    })
                })
            }
            playPause()
            loadSub().then(playPause).catch(onError)
        }

        return () => {
            if (jassubRef.current?.free) {
                jassubRef.current.free();
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
