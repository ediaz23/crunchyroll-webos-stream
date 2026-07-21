
import { useCallback, useState } from 'react'
import IconButton from '@enact/moonstone/IconButton'
import ContextualPopupDecorator from '@enact/moonstone/ContextualPopupDecorator'
import Picker from '@enact/moonstone/Picker'
import ri from '@enact/ui/resolution'
import $L from '@enact/i18n/$L'

import api from '../../api'
import { updateSubtitleSettings } from '../../hooks/subtitleLocal'
import { useNavigate } from '../../hooks/navigate'

const IconButtonWithPopup = ContextualPopupDecorator(IconButton)

// Percentages exposed to the user. 100 = 1.0×. Steps of 10 for font and 25
// for outline keep the Picker navigable with the remote (short-press = one
// step) without offering more precision than a viewer can tell apart.
const FONT_STEP = 10
const FONT_MIN = 60
const FONT_MAX = 200
const OUTLINE_STEP = 25
const OUTLINE_MIN = 50
const OUTLINE_MAX = 300
// Offset in seconds; positive advances subs, negative delays them.
const OFFSET_STEP = 0.25
const OFFSET_MIN = -5
const OFFSET_MAX = 5

const range = (min, max, step) => {
    const out = []
    for (let v = min; v <= max; v += step) {
        out.push(v)
    }
    return out
}

const FONT_VALUES = range(FONT_MIN, FONT_MAX, FONT_STEP)
const OUTLINE_VALUES = range(OUTLINE_MIN, OUTLINE_MAX, OUTLINE_STEP)
// Round to 2 decimals; floating-point drift on repeated 0.25 additions.
const OFFSET_VALUES = range(OFFSET_MIN, OFFSET_MAX, OFFSET_STEP).map(v => Math.round(v * 100) / 100)
const FONT_LABELS = FONT_VALUES.map(v => `${v}%`)
const OUTLINE_LABELS = OUTLINE_VALUES.map(v => `${v}%`)
const OFFSET_LABELS = OFFSET_VALUES.map(v => `${v > 0 ? '+' : ''}${v.toFixed(2)}s`)

const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ri.scale(12),
    padding: `${ri.scale(4)}px ${ri.scale(12)}px`,
}

const Panel = () => {
    const initialConfig = api.config.getAppConfig() || {}
    const [fontScale, setFontScale] = useState(initialConfig.subtitleFontScale || 100)
    const [outlineScale, setOutlineScale] = useState(initialConfig.subtitleOutlineScale || 100)
    const [timeOffset, setTimeOffset] = useState(initialConfig.subtitleTimeOffset || 0)

    const fontIndex = Math.max(0, FONT_VALUES.indexOf(fontScale))
    const outlineIndex = Math.max(0, OUTLINE_VALUES.indexOf(outlineScale))
    // indexOf on floats is fragile; find the nearest bucket.
    const offsetIndex = Math.max(0, OFFSET_VALUES.findIndex(v => Math.abs(v - timeOffset) < 1e-6))

    const onChangeFont = useCallback(({ value }) => {
        const next = FONT_VALUES[value]
        setFontScale(next)
        api.config.setAppConfig({ subtitleFontScale: next })
        updateSubtitleSettings({ fontScale: next })
    }, [])

    const onChangeOutline = useCallback(({ value }) => {
        const next = OUTLINE_VALUES[value]
        setOutlineScale(next)
        api.config.setAppConfig({ subtitleOutlineScale: next })
        updateSubtitleSettings({ outlineScale: next })
    }, [])

    const onChangeOffset = useCallback(({ value }) => {
        const next = OFFSET_VALUES[value]
        setTimeOffset(next)
        api.config.setAppConfig({ subtitleTimeOffset: next })
        updateSubtitleSettings({ timeOffset: next })
    }, [])

    return (
        <div>
            <div style={rowStyle}>
                <span>{$L('Size')}</span>
                <Picker value={fontIndex} onChange={onChangeFont} width='small' joined>
                    {FONT_LABELS}
                </Picker>
            </div>
            <div style={rowStyle}>
                <span>{$L('Outline')}</span>
                <Picker value={outlineIndex} onChange={onChangeOutline} width='small' joined>
                    {OUTLINE_LABELS}
                </Picker>
            </div>
            <div style={rowStyle}>
                <span>{$L('Offset')}</span>
                <Picker value={offsetIndex} onChange={onChangeOffset} width='small' joined>
                    {OFFSET_LABELS}
                </Picker>
            </div>
        </div>
    )
}

const SubtitleStyleSelect = ({ ...rest }) => {
    const { pushHistory, popHistory } = useNavigate()
    /** @type {[Boolean, Function]} */
    const [showPanel, setShowPanel] = useState(false)

    const togglePanel = useCallback(() => {
        if (showPanel) {
            setShowPanel(false)
            popHistory()
        } else {
            setShowPanel(true)
            pushHistory(() => setShowPanel(false))
        }
    }, [showPanel, setShowPanel, pushHistory, popHistory])

    const panel = useCallback(() => <Panel />, [])

    return (
        <IconButtonWithPopup
            backgroundOpacity='lightTranslucent'
            open={showPanel}
            onClick={togglePanel}
            onClose={togglePanel}
            popupComponent={panel}
            direction='up'
            showCloseButton
            {...rest}>
            aA
        </IconButtonWithPopup>
    )
}

export default SubtitleStyleSelect
