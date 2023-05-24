
import 'webostvjs'
import utils from '../utils'
import logger from '../logger'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

const serviceURL = 'luna://com.crunchyroll.stream.app.service/'

/**
 * Function to bypass cors issues
 * @returns {Promise}
 */
const customFetch = async (url, config) => {
    let out = Promise.resolve()
    const { method } = config
    if (['put', 'delete', 'patch'].includes(method)) {
        out = new Promise((res, rej) => {
            config.url = url
            if (config.body && config.body instanceof URLSearchParams) {
                config.body = config.body.toString()
            }
            const onSuccess = (data) => {
                logger.debug('res okey')
                logger.debug(data)
                const res2 = {
                    ok: true,
                    status: data.status,
                    statusText: data.statusText,
                    json: async () => Promise.resolve(JSON.parse(data.content)),
                    text: async () => Promise.resolve(data.content),
                }
                if (200 <= data.status && data.status < 300) {
                    res(res2)
                } else {
                    res2.ok = false
                    res(res2)
                }
            }
            const onFailure = (error) => {
                logger.error('res error')
                logger.error(error)
                rej(error)
            }
            if (utils.isTv()) {
                webOS.service.request(serviceURL, {
                    method: 'forwardRequest',
                    parameters: config,
                    onSuccess,
                    onFailure
                })

            } else {
                fetch('http://localhost:8052/webos2', {
                    method: 'post',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(config),
                }).then(res2 => res2.json()).then(onSuccess).catch(onFailure)
            }
        })
    } else {
        out = fetch(url, config)
    }
    return out
}

const useCustomFetch = () => customFetch

export default useCustomFetch
