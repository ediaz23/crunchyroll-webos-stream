
import { Component } from 'react'

import { $L } from '../hooks/language'
import ErrorPanel from '../views/ErrorPanel'
import logger from '../logger'


class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
        this.promiseRejectionHandler = (event) => {
            // get uncatch promises
            this.componentDidCatch(event.reason)
            this.setState({ hasError: true, error: event.reason })
        }
        this.closeErrorPanel = () => {
            // back to normal use
            this.setState({ hasError: false, error: null })
        }
    }

    static getDerivedStateFromError(error) {
        // normal uncatch error
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        // logging error
        logger.error('ErrorBoundary componentDidCatch')
        if (error) {
            logger.error(error)
        }
        if (errorInfo) {
            logger.error(errorInfo)
        }
    }

    componentDidMount() {
        // Add an event listener to the window to catch unhandled promise rejections & stash the error in the state
        window.addEventListener('unhandledrejection', this.promiseRejectionHandler)
    }

    componentWillUnmount() {
        // remove event
        window.removeEventListener('unhandledrejection', this.promiseRejectionHandler);
    }

    render() {
        if (this.state.hasError) {
            let errorMessage = $L('Unhandled error occurred')
            let onlyClose = false
            if (this.state.error) {
                if (this.state.error.message) {
                    errorMessage = this.state.error.message
                    if (this.state.error.httpStatus &&
                        [408, 429, 500, 502, 503, 504].includes(this.state.error.httpStatus)) {
                        onlyClose = true
                    }
                } else if (this.state.error.error && typeof this.state.error.error === 'string') {
                    errorMessage = this.state.error.error
                    onlyClose = !!this.state.error.retry
                } else {
                    errorMessage = `${this.state.error}`
                }
            }
            return (
                <ErrorPanel
                    message={errorMessage}
                    closeErrorPanel={this.closeErrorPanel}
                    onlyClose={onlyClose}
                    {...this.props} />
            )
        }


        return this.props.children
    }
}

export default ErrorBoundary
