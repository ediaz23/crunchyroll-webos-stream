
import 'webostvjs'
import utils from './utils'
import api from './api'
import logger from './logger'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

const appId = 'com.crunchyroll.stream.app';

// Define DRM Type
const drmType = 'widevine'
let clientId = null
let isDrmClientLoaded = false
let subscriptionHandler = null

async function loadDrmClient() {
    if (utils.isTv()) {
        return new Promise((res, rej) => {
            webOS.service.request('luna://com.webos.service.drm', {
                method: 'load',
                parameters: {
                    drmType,
                    appId,
                },
                onSuccess: (result) => {
                    clientId = result.clientId
                    isDrmClientLoaded = true
                    console.log('DRM Client is loaded successfully.')
                    res(clientId)
                },
                onFailure: (result) => {
                    console.error('loadDrmClient', result)
                    rej()
                },
            })
        })
    }
}

async function subscribeLicensingError() {
    if (utils.isTv() && isDrmClientLoaded && clientId) {
        return new Promise((res, rej) => {
            const request = webOS.service.request('luna://com.webos.service.drm', {
                method: 'getRightsError',
                parameters: {
                    clientId,
                    subscribe: true
                },
                onSuccess: (result) => { // Subscription Callback
                    console.log('subscribeLicensingError', result)
                    /*
                        contentId = result.contentId;
                        if (contentId == msgId) {
                            if (0 == result.errorState) {
                                console.log('No license');
                                // Do something for error handling
                            }
                            else if (1 == result.errorState) {
                                console.log('Invalid license');
                                // Do something for error handling
                            }
                            console.log('DRM System ID: ' + result.drmSystemId);
                            console.log('License Server URL: ' + result.rightIssueUrl);
                        }
                        */
                    res()
                },
                onFailure: (result) => {
                    console.error('subscribeLicensingError', result)
                    rej()
                }
            })
            //Register subscription handler
            subscriptionHandler = request
        })
    }
}

/*
<ContentURL>: The content URL.
<DeviceID>: Device identification.
<StreamID>: Data stream identification.
<ClientIP>: Client's IP address.
<DRMServerURL>: DRM server URL.
<DRMAckServerURL>: DRM acknowledgment server URL.
<DRMHeartBeatURL>: DRM heartbeat server URL.
<DRMHeartBeatPeriod>: DRM heartbeat period.
<UserData>: User data.
<Portal>: Portal information.
<StoreFront>: Online store information.
<BandwidthCheckURL>: URL for bandwidth check.
<BandwidthCheckInterval>: Bandwidth check interval.

<ContentURL>: La URL del contenido.
<DeviceID>: Identificación del dispositivo.
<StreamID>: Identificación del flujo de datos.
<ClientIP>: Dirección IP del cliente.
<DRMServerURL>: URL del servidor DRM.
<DRMAckServerURL>: URL del servidor de confirmación DRM.
<DRMHeartBeatURL>: URL del servidor de latido del DRM.
<DRMHeartBeatPeriod>: Período de latido del DRM.
<UserData>: Datos del usuario.
<Portal>: Información sobre el portal.
<StoreFront>: Información sobre la tienda en línea.
<BandwidthCheckURL>: URL para verificar el ancho de banda.
<BandwidthCheckInterval>: Intervalo de verificación de ancho de banda.
*/

/**
 * @param {import('./AudioList').Audio} audio
 * @param {import('./components/player/Player').Stream} stream
 */
async function sendRightInformation(audio, stream) {
    if (utils.isTv() && isDrmClientLoaded && clientId) {
        const device = api.config.getDevice()
        const msg = `
<?xml version="1.0" encoding="utf-8"?>
<WidevineCredentialsInfo xmlns="http://www.smarttv-alliance.org/DRM/widevine/2012/protocols/">
    <ContentURL>${stream.url}</ContentURL>
    <DeviceID>${device.id}</DeviceID>
    <StreamID>${audio.guid}</StreamID>
    <ClientIP></ClientIP>
    <DRMServerURL>https://cr-license-proxy.prd.crunchyrollsvc.com/v1/license/widevine</DRMServerURL>
    <DRMAckServerURL></DRMAckServerURL>
    <DRMHeartBeatURL></DRMHeartBeatURL>
    <DRMHeartBeatPeriod></DRMHeartBeatPeriod>
    <UserData></UserData>
    <Portal></Portal>
    <StoreFront></StoreFront>
    <BandwidthCheckURL></BandwidthCheckURL>
    <BandwidthCheckInterval></BandwidthCheckInterval>
</WidevineCredentialsInfo>
`
        const msgType = 'application/widevine+xml'
        const drmSystemId = 'urn:dvb:casystemid:19156'
        return new Promise((res, rej) => {
            webOS.service.request('luna://com.webos.service.drm', {
                method: 'sendDrmMessage',
                parameters: {
                    clientId,
                    msgType,
                    msg,
                    drmSystemId
                },
                onSuccess: (result) => {
//                    const resultCode = result.resultCode
                    console.log('sendRightInformation', result)
                    /*
                    if (resultCode === 0) {
                        res()
                    } else {
                        // Do Handling DRM message error
                        rej()
                    }
                    */
                   res()
                },
                onFailure: (result) => {
                    console.error('sendRightInformation', result)
                    rej()
                }
            })
        })
    }
}

async function unloadDrmClient() {
    if (utils.isTv() && isDrmClientLoaded && clientId) {
        return new Promise((res, rej) => {
            webOS.service.request('luna://com.webos.service.drm', {
                method: 'unload',
                parameters: { clientId },
                onSuccess: () => {
                    isDrmClientLoaded = false
                    clientId = null
                    console.log('DRM Client is unloaded successfully.')
                    res()
                },
                onFailure: (result) => {
                    console.error('unloadDrmClient', result)
                    rej()
                }
            })
            // Cancel the subscription
            if (subscriptionHandler) {
                subscriptionHandler.cancel()
                subscriptionHandler = null
            }
        })
    }
}

export default {
    loadDrmClient,
    unloadDrmClient,
    sendRightInformation,
    subscribeLicensingError,
}
