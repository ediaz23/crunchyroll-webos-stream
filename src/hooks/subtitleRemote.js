
import SubRemote from '../lib/SubRemote'

import { customFetch } from './customFetch'
//import { getFonts } from './fonts'
//import logger from '../logger'
//import utils from '../utils'


/** @type {SubRemote} */
let subRemoteObj = null

/**
 * create or reuse sub worker
 * @param {HTMLVideoElement} video
 * @param {String} subUrl
 */
export const createSubRemoteWorker = async (video, subUrl) => {
    let resolve, reject
    const prom = new Promise((res, rej) => { resolve = res; reject = rej })
    const subRes = await customFetch(subUrl)
    const subContent = await subRes.text()
    if (subRemoteObj) {
        subRemoteObj.setNewContext({ video, subContent }).then(resolve).catch(reject)
    } else {
        //        const { libassMemoryLimit, libassGlyphLimit } = await getMemoryLimits()
        //        const fonts = await getFonts()
        subRemoteObj = new SubRemote({
            video,
            subUrl,
            subContent,
            //            fonts: fonts.data,
            //            fallbackFont: fonts.defaultFont,
            serverUrl: 'http://localhost:19090',
            maxBytesCache: 20 * 1024 * 1024,
            //            debug: true,
        })
        subRemoteObj.addEventListener('ready', resolve, { once: true })
        subRemoteObj.addEventListener('error', reject, { once: true })
        prom.then(() => {
            // free memory
            //            fonts.data = null
            //            fonts.names = null
            //            fonts.promise = null
            //            fonts.ready = false
        })
    }
    return prom
}

/**
 * Destroy current sub worker
 */
export const destroySubRemoteWorker = () => {
    subRemoteObj?.destroy()
    subRemoteObj = null
}
