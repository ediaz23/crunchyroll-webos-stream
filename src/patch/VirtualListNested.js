
import { Fragment } from 'react'
import kind from '@enact/core/kind'
import { I18nContextDecorator } from '@enact/i18n/I18nDecorator'
import { getTargetByDirectionFromElement } from '@enact/spotlight/src/target'
import { Spottable } from '@enact/spotlight/Spottable'
import Spotlight, { getDirection } from '@enact/spotlight'
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator'
import Accelerator from '@enact/spotlight/Accelerator'
import { itemSizesShape } from '@enact/ui/VirtualList'
import PropTypes from 'prop-types'
import { VirtualListBase as VirtualListSuperBase } from '@enact/moonstone/VirtualList'
import { ScrollableBase as ScrollableSuperBase } from '@enact/moonstone/Scrollable'
import { ScrollableVirtualList as ScrollableVirtualListSuperBase } from '@enact/moonstone/VirtualList/VirtualListBase'
import Skinnable from '@enact/moonstone/Skinnable'
import warning from 'warning'


const SpotlightAccelerator = new Accelerator();
const SpotlightPlaceholder = Spottable('div')
const getNumberValue = (index) => {
    // using '+ operator' for string > number conversion based on performance: https://jsperf.com/convert-string-to-number-techniques/7
    let number = +index;
    // should return -1 if index is not a number or a negative value
    return number >= 0 ? number : -1;
}

class VirtualListBase extends VirtualListSuperBase {

    constructor(props) {
        super(props)

        this.lastFocusedCellPosition = null
        this.preservedCellPosition = null

        /** @type {Function} */
        this.superOnKeyDown = this.onKeyDown
        this.onKeyDown = (ev) => {
            const { keyCode } = ev
            const direction = getDirection(keyCode)
            let callSuper = false
            if (direction || ['down', 'up', 'right', 'left'].includes(direction)) {
                if (this.props.direction === 'vertical') {
                    callSuper = ['down', 'up'].includes(direction)
                } else if (this.props.direction === 'horizontal') {
                    callSuper = ['right', 'left'].includes(direction)
                } else {
                    callSuper = true
                }
            } else {
                callSuper = true
            }
            if (callSuper) {
                if (direction && this.props.direction === 'vertical') {
                    this.onKeyDownPatch(ev)
                } else {
                    this.superOnKeyDown(ev)
                }
            }
        }
        if (this.props.direction === 'vertical') {
            this.setLastFocusedNode = this.setLastFocusedNodePatch.bind(this)
            this.onAcceleratedKeyDown = this.onAcceleratedKeyDownPatch.bind(this)
            this.focusByIndex = this.focusByIndexPatch.bind(this)
            this.getItemNode = this.getItemNodePatch.bind(this)
        }
    }

    /**
     * @param {HTMLElement} node
     */
    setLastFocusedNodePatch(node) {
        const row = this.getRowContainer(node)
        this.lastFocusedIndex = row && row.dataset && getNumberValue(row.dataset.index)
        const nodeRect = node.getBoundingClientRect()
        this.lastFocusedCellPosition = nodeRect.x
    }

    /**
     * @param {HTMLElement} target
     * @returns {HTMLElement}
     */
    getRowContainer(target) {
        /** @type {HTMLElement} */
        const container = this.uiRefCurrent.containerRef.current
        /** @type {HTMLElement} */
        let targetRow = null
        container.querySelectorAll(`#${this.props.childProps.id}`).forEach(val => {
            if (val.contains(target)) {
                targetRow = val
            }
        })
        return targetRow
    }

    /**
     * @param {Event} ev
     */
    onKeyDownPatch(ev) {
        /** @type {{keyCode: String, target: HTMLElement}} */
        const { keyCode, target } = ev;
        const direction = getDirection(keyCode);

        Spotlight.setPointerMode(false);

        const { spotlightId } = this.props;
        const targetIndex = target.dataset.index;
        const isNotItem = (
            // if target has an index, it must be an item
            !targetIndex &&
            // if it lacks an index and is inside the scroller, we need to handle this
            target.matches(`[data-spotlight-id="${spotlightId}"] *`)
        );
        const targetRect = target.getBoundingClientRect()
        const cellPosition = targetRect.x;
        const targetRow = this.getRowContainer(target)
        const rowIndex = targetRow && getNumberValue(targetRow.dataset.index)
        const candidate = getTargetByDirectionFromElement(direction, target);
        const candidateRow = this.getRowContainer(candidate)
        const candateRowIndex = candidateRow && getNumberValue(candidateRow.dataset.index)
        let isLeaving = false;

        if (isNotItem) { // if the focused node is not an item
            if (!ev.currentTarget.contains(candidate)) { // if the candidate is out of a list
                isLeaving = true;
            }
        } else if (candateRowIndex !== rowIndex) { // the focused node is an item and focus will move out of the item
            const { repeat } = ev;
            const { isDownKey, isUpKey, isLeftMovement, isRightMovement,
                isWrapped, nextIndex } = this.getNextIndex({ index: rowIndex, keyCode, repeat });

            if (nextIndex >= 0) { // if the candidate is another item
                ev.preventDefault();
                ev.stopPropagation();
                this.onAcceleratedKeyDownPatch({ isWrapped, keyCode, nextIndex, repeat, target, index: rowIndex, cellPosition });
            } else { // if the candidate is not found
                const { dataSize, focusableScrollbar, isHorizontalScrollbarVisible, isVerticalScrollbarVisible } = this.props;
                const { dimensionToExtent, isPrimaryDirectionVertical } = this.uiRefCurrent;
                const column = rowIndex % dimensionToExtent;
                const row = (rowIndex - column) % dataSize / dimensionToExtent;
                const directions = {};
                let isScrollbarVisible;

                if (isPrimaryDirectionVertical) {
                    directions.left = isLeftMovement;
                    directions.right = isRightMovement;
                    directions.up = isUpKey;
                    directions.down = isDownKey;
                    isScrollbarVisible = isVerticalScrollbarVisible;
                } else {
                    directions.left = isUpKey;
                    directions.right = isDownKey;
                    directions.up = isLeftMovement;
                    directions.down = isRightMovement;
                    isScrollbarVisible = isHorizontalScrollbarVisible;
                }

                isLeaving =
                    directions.up && row === 0 ||
                    directions.down && row === Math.floor((dataSize - 1) % dataSize / dimensionToExtent) ||
                    directions.left && column === 0 ||
                    directions.right && (!focusableScrollbar || !isScrollbarVisible) && (column === dimensionToExtent - 1 || rowIndex === dataSize - 1 && row === 0);

                if (repeat && isLeaving) { // if focus is about to leave items by holding down an arrowy key
                    ev.preventDefault();
                    ev.stopPropagation();
                } else if (!isLeaving && Spotlight.move(direction)) {
                    throw new Error('onKeyDownPatch 1')
                } else if (isLeaving && directions.up && row === 0) {
                    const newCandidate = getTargetByDirectionFromElement(direction, target.parentElement)
                    if (newCandidate) {
                        ev.preventDefault()
                        ev.stopPropagation()
                        Spotlight.focus(newCandidate)
                    }
                }
            }
        }

        if (isLeaving) {
            SpotlightAccelerator.reset();
        }
    }

    /**
     * Handle `onKeyDown` event
     */
    onAcceleratedKeyDownPatch({ isWrapped, keyCode, nextIndex, repeat, target, index, cellPosition }) {
        const { cbScrollTo, wrap } = this.props;
        const { dimensionToExtent, primary: { clientSize, itemSize }, scrollPositionTarget } = this.uiRefCurrent;
        const direction = getDirection(keyCode);

        this.isScrolledBy5way = false;
        this.isScrolledByJump = false;

        if (nextIndex >= 0 && cellPosition >= 0) {
            const
                row = Math.floor(index / dimensionToExtent),
                nextRow = Math.floor(nextIndex / dimensionToExtent),
                start = this.uiRefCurrent.getGridPosition(nextIndex).primaryPosition,
                end = this.props.itemSizes ? this.uiRefCurrent.getItemBottomPosition(nextIndex) : start + itemSize,
                startBoundary = scrollPositionTarget,
                endBoundary = startBoundary + clientSize;

            this.lastFocusedIndex = nextIndex;
            this.lastFocusedCellPosition = cellPosition;
            if (start >= startBoundary && end <= endBoundary) {
                // The next item could be still out of viewport. So we need to prevent scrolling into view with `isScrolledBy5way` flag.
                this.isScrolledBy5way = true;
                this.focusByIndexPatch(nextIndex, cellPosition, direction);
                this.isScrolledBy5way = false;
            } else if (row === nextRow) {
                this.focusByIndexPatch(nextIndex, cellPosition, direction);
            } else {

                this.isScrolledBy5way = true;
                this.isWrappedBy5way = isWrapped;

                if (isWrapped && wrap === true && this.getItemNode(nextIndex, cellPosition) === null) {
                    this.pause.pause();
                    target.blur();
                }
                this.focusByIndexPatch(nextIndex, cellPosition, direction);
                cbScrollTo({
                    index: nextIndex,
                    stickTo: index < nextIndex ? 'end' : 'start',
                    animate: !(isWrapped && wrap === 'noAnimation')
                });

            }
        } else if (!repeat && Spotlight.move(direction)) {
            SpotlightAccelerator.reset();
        }
    }

    focusByIndexPatch(index, cellPosition, direction) {
        const item = this.getItemNodePatch(index, cellPosition);
        let returnVal = false;

        if (!item && index >= 0 && index < this.props.dataSize) {
            // Item is valid but since the the dom doesn't exist yet, we set the index to focus after the ongoing update
            this.preservedIndex = index;
            this.preservedCellPosition = cellPosition
            this.lastSpotlightDirection = direction;
            this.restoreLastFocused = true;
        } else {
            const
                current = Spotlight.getCurrent(),
                candidate = current ? getTargetByDirectionFromElement(direction, current) : item;

            if (this.isWrappedBy5way) {
                SpotlightAccelerator.reset();
                this.isWrappedBy5way = false;
            }

            this.pause.resume();
            if (item.contains(candidate)) {
                returnVal = this.focusOnNode(candidate);
            } else {
                returnVal = this.focusOnNode(item);
            }
            this.isScrolledByJump = false;
        }

        return returnVal;
    }

    /*
     * Returns a node for a given index after checking `data-index` attribute.
     * Returns null if no matching node is found.
     */
    getItemNodePatch(index, cellPosition) {
        const { numOfItems } = this.uiRefCurrent.state
        const itemContainerNode = this.uiRefCurrent.itemContainerRef.current;
        let out = null

        if (itemContainerNode) {
            /** @type {HTMLElement} */
            const itemNode = itemContainerNode.children[index % numOfItems];
            if (itemNode) {
                let distance = Infinity
                for (const child of itemNode.querySelectorAll(`#${this.props.childProps.cellId}`)) {
                    const childRect = child.getBoundingClientRect()
                    let newDistance = 0
                    if (childRect.x <= 0) {
                        newDistance = cellPosition + Math.abs(childRect.x)
                    } else {
                        newDistance = Math.abs(childRect.x - cellPosition)
                    }
                    if (newDistance < distance) {
                        out = child
                        distance = newDistance
                    }
                }
            }
        }
        return out;
    }

}


class ScrollableBase extends ScrollableSuperBase {

    constructor(props) {
        super(props)
        /** @type {{left: Number, top: Number}} */
        this.lastOffsetFocus = null
        /** @type {Function} */
        this.superOnFocus = this.onFocus
        this.onFocus = this.onFocusPatch.bind(this)
    }

    /**
     * @param {Event} ev
     */
    onFocusPatch(ev) {
        /** @type {DOMRect} */
        const rect = ev.target.getBoundingClientRect()
        let callSuper = false
        if (this.lastOffsetFocus) {
            if (this.props.direction === 'vertical') {
                callSuper = this.lastOffsetFocus.top !== rect.top
            } else if (this.props.direction === 'horizontal') {
                callSuper = this.lastOffsetFocus.left !== rect.left
            } else {
                callSuper = true
            }
        } else {
            callSuper = false
        }
        if (callSuper) {
            this.superOnFocus(ev)
        }
        this.lastOffsetFocus = { left: rect.left, top: rect.top, }
    }
}

/**
 * A Moonstone-styled component that provides horizontal and vertical scrollbars.
 *
 * @class Scrollable
 * @memberof moonstone/Scrollable
 * @mixes spotlight/SpotlightContainerDecorator
 * @extends moonstone/Scrollable.ScrollableBase
 * @ui
 * @public
 * @see https://github.com/enactjs/moonstone/blob/master/VirtualList/VirtualList.js
 */
const Scrollable = Skinnable(
    SpotlightContainerDecorator(
        {
            overflow: true,
            preserveId: true,
            restrict: 'self-first'
        },
        I18nContextDecorator(
            { rtlProp: 'rtl' },
            ScrollableBase
        )
    )
)

/* eslint-disable enact/prop-types */
const listItemsRenderer = (props) => {
    const {
        cc,
        handlePlaceholderFocus,
        itemContainerRef: initUiItemContainerRef,
        primary,
        role
    } = props

    return (
        <Fragment>
            {cc.length ? (
                <div ref={initUiItemContainerRef} role={role}>{cc}</div>
            ) : null}
            {primary ? null : (
                <SpotlightPlaceholder
                    data-index={0}
                    data-vl-placeholder
                    // a zero width/height element can't be focused by spotlight so we're giving
                    // the placeholder a small size to ensure it is navigable
                    style={{ width: 10 }}
                    onFocus={handlePlaceholderFocus}
                />
            )}
        </Fragment>
    )
}

/* eslint-enable enact/prop-types */
const ScrollableVirtualList = ({ ...rest }) => {
    const { role, ...combinedRest } = { ...ScrollableVirtualListSuperBase.defaultProps, ...rest }
    warning(
        !rest.itemSizes || !rest.cbScrollTo,
        'VirtualList with `minSize` in `itemSize` prop does not support `cbScrollTo` prop'
    )

    return (
        <Scrollable
            {...combinedRest}
            childRenderer={(childProps) => { // eslint-disable-line react/jsx-no-bind
                return (
                    <VirtualListBase
                        {...childProps}
                        focusableScrollbar={combinedRest.focusableScrollbar}
                        itemsRenderer={listItemsRenderer}
                        role={role}
                    />
                )
            }}
        />
    )
}

ScrollableVirtualList.propTypes = ScrollableVirtualListSuperBase.propTypes  // eslint-disable-line react/forbid-foreign-prop-types

/**
 * @see https://github.com/enactjs/moonstone/blob/master/VirtualList/VirtualList.js
 */
const VirtualListNested = kind({
    name: 'VirtualListNested',

    propTypes: /** @lends moonstone/VirtualList.VirtualList.prototype */ {
        /**
         * Size of an item for the VirtualList; valid value is a number generally.
         * For different item size, value is an object that has `minSize`
         * and `size` as properties.
         * If the direction for the list is vertical, itemSize means the height of an item.
         * For horizontal, it means the width of an item.
         *
         * Usage:
         * ```
         * <VirtualList itemSize={ri.scale(72)} />
         * ```
         *
         * @type {Number|import('@enact/ui/VirtualList').itemSizesShape}
         * @required
         * @public
         */
        itemSize: PropTypes.oneOfType([PropTypes.number, itemSizesShape]).isRequired
    },

    render: ({ itemSize, ...rest }) => {
        const props = itemSize && itemSize.minSize ?
            {
                itemSize: itemSize.minSize,
                itemSizes: itemSize.size
            } :
            {
                itemSize
            }

        return (<ScrollableVirtualList {...rest} {...props} />)
    }
})

export default VirtualListNested
