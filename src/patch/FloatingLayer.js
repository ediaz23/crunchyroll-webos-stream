
import FloatingLayer from '@enact/ui/FloatingLayer'

/**
 * Patch FloatingLayerBase not propaging event
 */
class FloatingLayerFix extends FloatingLayer {

    render() {
        const out = { ...super.render() }
        out.type = class extends out.type {
            constructor(props) {
                super(props)
                this.stopPropagation = (ev) => {
                    ev.nativeEvent.stopImmediatePropagation()
                    if (this.props.children.props.onClick) {
                        this.props.children.props.onClick(ev)
                    }
                }
            }
        }
        return out
    }

}

export default FloatingLayerFix
