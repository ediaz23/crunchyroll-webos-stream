
import { logger } from 'crunchyroll-js-api'
import utils from './utils'

if (process.env.NODE_ENV !== 'production') {
    logger.setLevel('debug')
} else {
    logger.setLevel('error')
}

if (utils.isTv()) {
    logger.activeColor(false)
}

export default logger
