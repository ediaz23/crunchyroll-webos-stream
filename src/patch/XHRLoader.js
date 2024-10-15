
import * as fetchUtils from '../hooks/customFetch'
import { default as FakeXMLHttpRequestBase } from 'fake-xml-http-request'
import logger from '../logger'


/**
 * Fix other type of response
 */
class FakeXMLHttpRequest extends FakeXMLHttpRequestBase {
    /**
     * @param {ArrayBuffer} body
     */
    _setResponseBody(body) {
        this.responseText = ''

        if (this.responseType === 'arraybuffer') {
            this.response = body
        } else if (this.responseType === 'blob') {
            this.response = new window.Blob([body])
        } else {
            const decoder = new window.TextDecoder()
            this.responseText = decoder.decode(body)
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

    _onProgress({ loaded, total }) {
        if (this.async) {
            this._readyStateChange(FakeXMLHttpRequest.LOADING)
        }
        this._progress(true, loaded, total)
    }
}


/**
 * redirect reques to webOS service
 * @param {import('fake-xml-http-request').default} xhr
 */
function onSend(xhr) {
    let timeout = undefined

    const config = fetchUtils.setUpRequest(xhr.url, {
        method: xhr.method,
        headers: xhr.requestHeaders,
    })

    const onSuccess = (data) => {
        clearTimeout(timeout)
        config.resStatus = 'done'
        const { status, content, headers, resUrl } = data
        logger.debug(`req ${config.method || 'get'} ${config.url} ${status}`)
        xhr.responseURL = resUrl
        xhr.respond(status, headers, content)
    }

    const onFailure = (error) => {
        clearTimeout(timeout)
        config.resStatus = 'fail'
        logger.error(`req ${config.method} ${config.url}`)
        logger.error(error)
        if (error.error) {
            xhr.respond(500, {}, error.error)
        } else {
            xhr.respond(500, {}, error)
        }
    }

    if (xhr.timeout) {
        config.timeout = xhr.timeout
        timeout = setTimeout(() => {
            config.resStatus = 'timeout'
            xhr.readyState = window.XMLHttpRequest.DONE
            xhr.ontimeout?.({})
        }, xhr.timeout)
    }

    const backOnAbort = xhr.onabort
    xhr.onabort = event => {
        config.resStatus = 'abort'
        if (backOnAbort) {
            backOnAbort(event)
        }
    }
    fetchUtils.makeRequest({ config, onSuccess, onFailure, onProgress: xhr._onProgress.bind(xhr) })
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
        xhr.onSend = onSend
        xhr.chunkSize = 2 << 11  // simulate progress but it's not realy used

        xhr.send()

        httpRequest.response = xhr
    }

    function abort(request) {
        const x = request.response
        if (x) {  // fix error
            x.onloadend = x.onerror = x.onprogress = undefined //Ignore events from aborted requests.
            x.abort()
        }
    }

    return { load, abort }
}

export default XHRLoader
