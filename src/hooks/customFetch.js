
import utils from '../utils'

/**
 * Function to bypass cors issues
 * @returns {Promise}
 */
const customFetch = async (url, config) => {
    const { method } = config
    if (['put', 'delete', 'patch'].includes(method)) {
        config.url = url
        if (utils.isTv()) {
            // TODO make request service
        } else {
            return fetch('http://localhost:8052/webos', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            })
        }
    }
    return fetch(url, config)
}

const useCustomFetch = () => customFetch

export default useCustomFetch
