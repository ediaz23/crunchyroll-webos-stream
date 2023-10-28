import { useCallback } from 'react'
import Dropdown from '@enact/moonstone/Dropdown'
import PropTypes from 'prop-types'


/**
 * @typedef LangTuple
 * @type {Object}
 * @property {String} key
 * @property {String} children
 */

/**
 * @param {{
    title: String,
    languages: Array<LangTuple>,
    save: Function,
    value: String}}
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
            onSelect={onSelected}>
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
