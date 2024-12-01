
import { useCallback } from 'react'
import { getDirection } from '@enact/spotlight'
import Dropdown from '@enact/moonstone/Dropdown'
import PropTypes from 'prop-types'


/**
 * @typedef LangTuple
 * @type {Object}
 * @property {String} key
 * @property {String} children
 */

/**
 * @param {Event} ev
 */
export const dropdownKeydown = ev => {
    const direction = getDirection(ev.keyCode)
    if (direction === 'right') {
        ev.nativeEvent.stopPropagation()
    }
}


/**
 * @param {Object} obj
 * @param {String} obj.title
 * @param {Array<LangTuple>} obj.languages
 * @param {Function} obj.save
 * @param {String} obj.value
 */
const SelectLanguage = ({ title, languages, save, value }) => {
    /** @type {Array<String>} */
    const langs = languages.map(lang => lang.key)
    /** @type {Function} */
    const onSelected = useCallback(({ selected }) => save(langs[selected]), [save, langs])

    return (
        <Dropdown title={title}
            selected={langs.indexOf(value)}
            width='x-large'
            onSelect={onSelected}
            onKeyDown={dropdownKeydown}
            showCloseButton>
            {languages}
        </Dropdown>
    )
}

SelectLanguage.propTypes = {
    title: PropTypes.string,
    languages: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string.isRequired,
        children: PropTypes.string.isRequired,
    })).isRequired,
    save: PropTypes.func.isRequired,
    value: PropTypes.string.isRequired,
}

export default SelectLanguage
