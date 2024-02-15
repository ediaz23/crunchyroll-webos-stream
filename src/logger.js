
import { logger } from 'crunchyroll-js-api'
import utils from './utils'

logger.setLevel('debug')

if (utils.isTv()) {
    logger.activeColor(false)
}

export default logger
