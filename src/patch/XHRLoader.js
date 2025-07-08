
import * as fetchUtils from '../hooks/customFetch'
import { default as FakeXMLHttpRequestBase } from 'fake-xml-http-request'
import logger from '../logger'

/** @type {{dashjs: import('dashjs')}*/
const { dashjs } = window


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
        fetchUtils.makeRequest({
            config: this.reqConfig,
            onSuccess: this._onSuccess.bind(this),
            onFailure: this._onFailure.bind(this),
            onProgress: this.async ? this._onProgress.bind(this) : null,
        }, !this.async, false)

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
     * @param {import('../hooks/customFetch').ResponseProxy} data
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
 */
function XHRLoader() {
    let instance;
    let xhr;

    /**
     * Load request
     * @param {CommonMediaRequest} commonMediaRequest
     * @param {CommonMediaResponse} commonMediaResponse
     */
    function load(commonMediaRequest, commonMediaResponse) {
        xhr = null;
        xhr = new FakeXMLHttpRequest();
        xhr.open(commonMediaRequest.method, commonMediaRequest.url, true);

        if (commonMediaRequest.responseType) {
            xhr.responseType = commonMediaRequest.responseType;
        }

        if (commonMediaRequest.headers) {
            for (let header in commonMediaRequest.headers) {
                let value = commonMediaRequest.headers[header];
                if (value) {
                    xhr.setRequestHeader(header, value);
                }
            }
        }

        xhr.withCredentials = commonMediaRequest.credentials === 'include';
        xhr.timeout = commonMediaRequest.timeout;

        xhr.onload = function() {
            commonMediaResponse.url = this.responseURL;
            commonMediaResponse.status = this.status;
            commonMediaResponse.statusText = this.statusText;
            commonMediaResponse.headers = dashjs.Utils.parseHttpHeaders(this.getAllResponseHeaders());
            commonMediaResponse.data = this.response;
        }
        if (commonMediaRequest.customData) {
            xhr.onloadend = commonMediaRequest.customData.onloadend;
            xhr.onprogress = commonMediaRequest.customData.onprogress
            xhr.onabort = commonMediaRequest.customData.onabort;
            xhr.ontimeout = commonMediaRequest.customData.ontimeout;
        }

        xhr.send();

        commonMediaRequest.customData.abort = abort.bind(this);
        return true;
    }

    function abort() {
        if (xhr) {
            xhr.onloadend = xhr.onerror = xhr.onprogress = xhr.onload = null; // Remove event listeners
            xhr.abort();
            xhr = null;
        }
    }

    function getXhr() {
        return xhr
    }

    function resetInitialSettings() {
        abort();
    }

    function reset() {
        abort();
        instance = null;
    }

    instance = {
        load,
        abort,
        getXhr,
        reset,
        resetInitialSettings
    };

    return instance;

}

export default XHRLoader
