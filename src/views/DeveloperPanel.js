
import 'webostvjs'
import { useState, useCallback, useRef } from 'react'
import { Row, Cell } from '@enact/ui/Layout'
import { Panel, Header } from '@enact/moonstone/Panels'
import BodyText from '@enact/moonstone/BodyText'
import Spinner from '@enact/moonstone/Spinner'
import Button from '@enact/moonstone/Button'
import ri from '@enact/ui/resolution'
import { v4 as uuidv4 } from 'uuid'

import Scroller from '../patch/Scroller'
import { $L } from '../hooks/language'
import { serviceURL } from '../hooks/customFetch'
import api from '../api'
import utils from '../utils'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

const DeveloperPanel = (props) => {

    const btnStyle = { marginTop: '1rem' }
    /** @type {[string, Function]}  */
    const [result, setResult] = useState('')
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(false)
    /** @type {{current: STring}} */
    const reqIdRef = useRef(null)

    const showResult = useCallback((r) => {
        console.log(r)
        if (typeof r === 'string') {
            setResult(r)
        } else if (r instanceof Error) {
            setResult(`${r.name} ${r.message} ${r.stack}`)
        } else {
            try {
                setResult(JSON.stringify(r, null, '  '))
            } catch (_e) {
                try {
                    setResult(utils.customStringify(r))
                } catch (_e1) {
                    setResult(r)
                }
            }
        }
    }, [])

    const runTest = useCallback((fn) => {
        const id = uuidv4()
        setResult('')
        setLoading(true)
        reqIdRef.current = id
        const timeout = setTimeout(() => {
            if (reqIdRef.current === id) {
                setLoading(false)
                reqIdRef.current = null
                setResult($L('Test took more than 10 seconds.'))
            }
        }, 10 * 1000)  // 5 seconds
        Promise.resolve(fn()).then(r => {
            if (reqIdRef.current === id) {
                showResult(r)
            }
        }).catch(e => {
            if (reqIdRef.current === id) {
                showResult(e)
            }
        }).finally(() => {
            clearTimeout(timeout)
            if (reqIdRef.current === id) {
                setLoading(false)
                reqIdRef.current = null
            }
        })
        return id
    }, [setResult, setLoading, showResult])

    const onClear = useCallback(() => { setResult('') }, [setResult])

    const onShowPassword = useCallback(() => {
        runTest(async () => {
            let out = await api.auth.getCredentials()
            if (!out) {
                out = $L('No credentials')
            }
            return out
        })
    }, [runTest])

    const onTestService = useCallback(() => {
        runTest(async () => {
            let out
            if (utils.isTv()) {
                out = new Promise((onSuccess, onFailure) => {
                    webOS.service.request(serviceURL, {
                        method: 'test',
                        parameters: { type: 'simple' },
                        onSuccess,
                        onFailure,
                    })
                })
            } else {
                out = $L('This is not a TV')
            }
            return out
        })
    }, [runTest])

    const onShowSession = useCallback(() => {
        runTest(async () => {
            let out = await api.auth.getSession()
            if (!out) {
                out = $L('No session stored')
            }
            return out
        })
    }, [runTest])

    const onForceReloadSession = useCallback(() => {
        runTest(async () => {
            let out = await api.auth.forceReloadSession()
            if (!out) {
                out = $L('No session stored')
            }
            return out
        })
    }, [runTest])

    const onTestLogin = useCallback(() => {
        runTest(async () => {
            await api.auth.login()
            return $L('Login okey')
        })
    }, [runTest])

    const onTestGetBenefits = useCallback(() => {
        runTest(async () => {
            await api.auth.login()
            const account = await api.account.getAccount()
            let out
            if (account) {
                out = await api.subscription.getUserBenefits(account)
            } else {
                out = $L('You need to log in before trying this test.')
            }
            return out
        })
    }, [runTest])

    const onTestGetProfiles = useCallback(() => {
        runTest(async () => {
            await api.auth.login()
            return await api.account.getProfiles()
        })
    }, [runTest])

    const onTestGetHomefeed = useCallback(() => {
        runTest(async () => {
            await api.auth.login()
            const { profiles } = await api.account.getProfiles()
            await api.auth.switchProfile(profiles[0].profile_id)
            return await api.discover.getHomeFeed(profiles[0])
        })
    }, [runTest])

    const onTestWasm = useCallback(() => {
        runTest(async () => {
            let out = 'WASM: no soportado'
            if ('WebAssembly' in window) {
                const bytes = new Uint8Array([
                    0x00, 0x61, 0x73, 0x6D, 0x01, 0x00, 0x00, 0x00,        // magic + version
                    0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7F,              // Type: 1 type (func [] -> i32)
                    0x03, 0x02, 0x01, 0x00,                                // Function: 1 function (type 0)
                    0x07, 0x07, 0x01, 0x03, 0x66, 0x6F, 0x6F, 0x00, 0x00,  // Export: 1, name "foo", func 0
                    0x0A, 0x06, 0x01, 0x04, 0x00, 0x41, 0x2A, 0x0B         // Code: 1 body, size 4, (i32.const 42; end)
                ]);

                try {
                    const { instance } = await WebAssembly.instantiate(bytes)
                    out = `WASM soportado, foo() = ${instance.exports.foo()}`
                } catch (e) {
                    out = `WASM fallo: ${e}`
                }
            }
            return out
        })
    }, [runTest])


    return (
        <Panel {...props}>
            <Header title="Developer Options" hideLine />
            {loading ?
                <Row align='center center'>
                    <Spinner />
                </Row>
                :
                <Row style={{ height: '100%' }}>
                    <Cell>
                        <BodyText className='app-version'>{$L('Version') + ' 2.1.1'} </BodyText>
                        <Button style={btnStyle} onClick={onClear}>
                            {$L('Clear')}
                        </Button>
                        <Button style={btnStyle} onClick={onShowPassword}>
                            {$L('Show credentials')}
                        </Button>
                        <Button style={btnStyle} onClick={onTestService}>
                            {$L('Test Service Up')}
                        </Button>
                        <Button style={btnStyle} onClick={onShowSession}>
                            {$L('Show session')}
                        </Button>
                        <Button style={btnStyle} onClick={onForceReloadSession}>
                            {$L('Force Reload session')}
                        </Button>
                        <Button style={btnStyle} onClick={onTestLogin}>
                            {$L('Test login')}
                        </Button>
                        <Button style={btnStyle} onClick={onTestGetBenefits}>
                            {$L('List Account Benefits')}
                        </Button>
                        <Button style={btnStyle} onClick={onTestGetProfiles}>
                            {$L('Show profiles')}
                        </Button>
                        <Button style={btnStyle} onClick={onTestGetHomefeed}>
                            {$L('Show Homefeed')}
                        </Button>
                        <Button style={btnStyle} onClick={onTestWasm}>
                            {$L('Wasm?')}
                        </Button>
                    </Cell>
                    <Cell>
                        <Scroller direction='vertical'
                            horizontalScrollbar='hidden'
                            verticalScrollbar='visible'
                            focusableScrollbar>
                            <div style={{ maxHeight: ri.scale(400) }}>
                                <BodyText component='pre'>
                                    {result}
                                </BodyText>
                            </div>
                        </Scroller>
                    </Cell>
                </Row>
            }
        </Panel>
    )
}

export default DeveloperPanel
