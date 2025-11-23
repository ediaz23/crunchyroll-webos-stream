
/*
import React from 'react'
import { default as VideoPlayerBase } from '@enact/moonstone/VideoPlayer'


videoPlayerStack
    I18nContextDecorator,
    Slottable,
    FloatingLayerDecorator,
    noname,
    div,
    Skinnable,
    noname,
    VideoPlayerBase,
    SpotlightContainerDecoratorAdapter,
    div,
    SpotlightContainerDecoratorAdapter,
    MediaSliderDecorator


const videoPlayerCheckChildren = ['noname', 'SpotlightContainerDecoratorAdapter', 'div']
const videoPlayerChidrenMap = {
    noname_3: 'div',
    div_4: 'Skinnable',
    noname_6: 'VideoPlayerBase',
    SpotlightContainerDecoratorAdapter_8: 'div',
    div_9: 'SpotlightContainerDecoratorAdapter',
    SpotlightContainerDecoratorAdapter_10: 'MediaSliderDecorator',
}

const getComponentName = (renderOut) => {
    return (
        renderOut?.type?.displayName ||
        renderOut?.type?.name ||
        (typeof renderOut?.type === 'string' ? renderOut?.type : 'noname')
    )
}


const VideoPlayer = class extends VideoPlayerBase {
    constructor(props) {
        super(props)
        this.buildPatchFunction()
        this.videoRef = null
    }

    getPatchName(index) {
        const compPatchName = `comp${index}Patch`
        const compBackName = `comp${index}Back`
        return [compPatchName, compBackName]
    }

    renderPatchComponent(Comp, props, ref) {
        let el
        if (Object.isPrototypeOf.call(React.Component, Comp)) {
            el = React.createElement(Comp, { ...props, ref })
        } else if (typeof Comp === 'function') {
            el = Comp({ ...props, ref }, ref)
        } else {
            el = React.createElement(Comp, { ...props, ref })
        }
        return el
    }

    buildPatchFunction() {
        for (let index = 0; index < 13; ++index) {
            const [compPatchName, compBackName] = this.getPatchName(index)
            const [nextCompPatchName, nexCompBackName] = this.getPatchName(index + 1)
            this[compPatchName] = React.forwardRef((props, ref) => {
                const compName = getComponentName({ type: this[compBackName] })
                let el = this.renderPatchComponent(this[compBackName], props, ref)
                if (!this[nexCompBackName]) {
                    if (videoPlayerCheckChildren.includes(compName)) {  // should modify children
                        let { children } = el.props || {}
                        children = Array.isArray(children) ? children : [children]
                        children = children.map((child, index2) => {
                            if (child && getComponentName(child) === videoPlayerChidrenMap[`${compName}_${index}`]) {
                                this[nexCompBackName] = child.type
                                child = React.createElement(
                                    this[nextCompPatchName],
                                    { ...child.props, key: child.key || `${compName}_${index2}` }
                                )
                            }
                            return child
                        })
                        if (this[nexCompBackName]) {
                            el = React.cloneElement(el, null, children)
                        }
                    } else if (!Object.isPrototypeOf.call(React.Component, this[compBackName])) {
                        this[nexCompBackName] = el.type
                        el = React.createElement(this[nextCompPatchName], el.props)
                    } else if (Object.isPrototypeOf.call(React.Component, this[compBackName])) {
                        this[nexCompBackName] = true
                        if (compName === 'MediaSliderDecorator') {
                            this.patchMediaSliderDecorator(el.type)
                        } else {
                            const self = this
                            function renderPatch() {
                                const el2 = renderPatch._super.apply(this)
                                self[nexCompBackName] = el2.type
                                if (compName === 'VideoPlayerBase') {
                                    self.videoRef = this
                                }
                                return React.createElement(
                                    self[nextCompPatchName],
                                    { ...el2.props, ref: this.setPlayerRef }
                                )
                            }
                            renderPatch._super = el.type.prototype.render
                            el.type.prototype.render = renderPatch
                        }
                    }
                }
                return el
            })
        }
    }

    patchMediaSliderDecorator(Comp) {
        var _jumpBy = 5
        var _jumpByResetTimeout = null
        var _jumpByDirection = 0
        var _getJumpBySeconds = function _getJumpBySeconds (direction) {
            _jumpBy = _jumpByDirection !== direction ? 5 : _jumpBy
            var out = _jumpBy
            clearTimeout(_jumpByResetTimeout)
            _jumpByDirection = direction
            if (_jumpBy <= 5) {
                // nothing
            } else if (_jumpBy <= 10) {
                _jumpByResetTimeout = setTimeout(() => { _jumpBy = 5 }, 2 * 1000)
            } else {
                _jumpByResetTimeout = setTimeout(() => { _jumpBy = 5 }, 5 * 1000)
            }
            _jumpBy = Math.min(_jumpBy << 1, 30)
            return out
        }
        var _decrement = function decrement(state) {
            if (state.tracking && state.x > 0) {
                var x = Math.max(0, state.x - (_getJumpBySeconds(-1) / this.videoRef.state.duration))
                return { x }
            }
            return null
        }
        var _increment = function increment(state) {
            if (state.tracking && state.x < 1) {
                const x = Math.min(1, state.x + (_getJumpBySeconds(1) / this.videoRef.state.duration))
                return { x }
            }
            return null
        }
    }

    render() {
        let el = super.render()
        if (this.props.jumpBy) {
            const [compPatchName, compBackName] = this.getPatchName(0)
            this[compBackName] = el.type
            el = React.createElement(this[compPatchName], el.props)
        }
        return el
    }
}


export default VideoPlayer
*/
