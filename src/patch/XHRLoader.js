
import * as fetchUtils from '../hooks/customFetch'
import { default as FakeXMLHttpRequestBase } from 'fake-xml-http-request'
import logger from '../logger'


/**
 * Fix other type of response
 */
class FakeXMLHttpRequest extends FakeXMLHttpRequestBase {

    /**
     * string for logging
     * @returns {String}
     */
    get logReq() {
        return `${this.method || 'GET'} ${this.url}`
    }

    /**
     * @override
     */
    respond(status, headers, body) {
        if (200 <= status && status < 300) {
            this.reqConfig.resStatus = 'done'
            logger.debug(`okey ${this.logReq} ${status}`)
        } else {
            this.reqConfig.resStatus = 'fail'
            logger.error(`error ${this.logReq}`)
            logger.error(body)
        }
        super.respond(status, headers, body)
    }

    /**
     * @override
     */
    send(data) {
        this.reqConfig = fetchUtils.setUpRequest(this.url, {
            method: this.method,
            headers: this.requestHeaders,
            timeout: this.timeout,
        })
        super.send(data)
        if (this.timeout) {
            this.reqTimeout = setTimeout(() => {
                logger.debug(`time ${this.logReq}`)
                this.reqConfig.resStatus = 'timeout'
                this.status = 0
                this.ontimeout?.({})
                this._readyStateChange(window.XMLHttpRequest.DONE)
            }, this.timeout)
        }
        if (this.async) {
            Promise.resolve().then(() => {
                fetchUtils.makeRequest({
                    config: this.reqConfig,
                    onSuccess: this._onSuccess.bind(this),
                    onFailure: this._onFailure.bind(this),
                    onProgress: this._onProgress.bind(this),
                })
            }).catch(this._onFailure.bind(this))
        } else {
            fetchUtils.makeRequest({
                config: this.reqConfig,
                onSuccess: this._onSuccess.bind(this),
                onFailure: this._onFailure.bind(this),
            })
        }
    }

    /**
     * @override
     */
    abort() {
        clearTimeout(this.reqTimeout)
        this.reqConfig.resStatus = 'abort'
        logger.debug(`abort ${this.logReq}`)
        super.abort()
    }

    /**
     * @param {ArrayBuffer} body
     */
    _setResponseBody(body) {
        clearTimeout(this.reqTimeout)
        this.responseText = ''

        if (this.responseType === 'arraybuffer') {
            this.response = body
        } else if (this.responseType === 'blob') {
            this.response = new window.Blob([body])
        } else {
            const decoder = new window.TextDecoder('utf-8')
            this.responseText = decoder.decode(new Uint8Array(body))
            if (this.responseType === 'json') {
                this.response = JSON.parse(this.responseText)
            } else if (this.responseType === 'document') {
                const parser = new window.DOMParser()
                this.response = parser.parseFromString(this.responseText, 'text/xml')
            } else {
                this.response = this.responseText
            }
        }
        if (this.async) {
            this._readyStateChange(FakeXMLHttpRequest.DONE)
        } else {
            this.readyState = FakeXMLHttpRequest.DONE
        }
    }

    /**
     * simulate progress donwloading
     * @param {Object} obj
     * @param {Number} obj.loaded
     * @param {Number} obj.total
     */
    _onProgress({ loaded, total }) {
        if (this.async) {
            this._readyStateChange(FakeXMLHttpRequest.LOADING)
        }
        this._progress(true, loaded, total)
    }

    /**
     * call on request end
     * @param {Object} data
     */
    _onSuccess(data) {
        const { status, content, headers, resUrl } = data
        this.responseURL = resUrl
        this.respond(status, headers, content)
    }

    /**
     * call on request end
     * @param {Object} error
     */
    _onFailure(error) {
        if (error.error) {
            this.respond(500, {}, error.error)
        } else {
            this.respond(500, {}, error)
        }
    }
}


/**
 * @module XHRLoader
 * @description Manages download by webOS service
 * @param {Object} cfg - dependencies from parent
 */
function XHRLoader(cfg) {
    cfg = cfg || {}
    const requestModifier = cfg.requestModifier

    function load(httpRequest) {
        if (requestModifier && requestModifier.modifyRequest) {
            requestModifier.modifyRequest(httpRequest, requestModifier)
                .then(() => requestFn(httpRequest))
        }
        else {
            requestFn(httpRequest)
        }
    }

    function requestFn(httpRequest) {
        const requestStartTime = new Date()
        const request = httpRequest.request

        let xhr = new FakeXMLHttpRequest()
        xhr.open(httpRequest.method, httpRequest.url, true)

        if (request.responseType) {
            xhr.responseType = request.responseType
        }

        if (request.range) {
            xhr.setRequestHeader('Range', 'bytes=' + request.range)
        }

        if (!request.requestStartDate) {
            request.requestStartDate = requestStartTime
        }

        if (requestModifier && requestModifier.modifyRequestHeader) {
            xhr = requestModifier.modifyRequestHeader(xhr, {
                url: httpRequest.url
            })
        }

        if (httpRequest.headers) {
            for (let header in httpRequest.headers) {
                let value = httpRequest.headers[header]
                if (value) {
                    xhr.setRequestHeader(header, value)
                }
            }
        }

        xhr.withCredentials = httpRequest.withCredentials

        xhr.onload = httpRequest.onload
        xhr.onloadend = httpRequest.onend
        xhr.onerror = httpRequest.onerror
        xhr.onprogress = httpRequest.progress
        xhr.onabort = httpRequest.onabort
        xhr.ontimeout = httpRequest.ontimeout
        xhr.timeout = httpRequest.timeout
        xhr.chunkSize = 2 << 11  // simulate progress but it's not realy used

        xhr.send()

        httpRequest.response = xhr
    }

    function abort(request) {
        if (request.response) {  // fix error
            request.response.abort()
        }
    }

    return { load, abort }
}

export default XHRLoader
