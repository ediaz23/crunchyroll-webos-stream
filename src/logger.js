

class Logger {
    constructor({ level }) {
        this.level = level || 'info'
        this.info = console.info.bind(console)
        this.error = console.error.bind(console)
        this.debug = console.debug.bind(console)
        this.log = console.log.bind(console)
    }
}

const logger = new Logger({level: 'debug'})

export default logger
