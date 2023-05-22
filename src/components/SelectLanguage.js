import { useCallback } from 'react'
import Dropdown from '@enact/moonstone/Dropdown'
import PropTypes from 'prop-types'


/**
 * @param {{languages: Array<{value: String, label: String}>}}
 */
const SelectLanguage = ({ title, profile, languages, save, name }) => {

    const onSelected = useCallback(async ({ selected }) => {
        await save(name, languages[selected])
    }, [languages, save, name])

    const selectedIndex = languages.findIndex(val => val.value === profile[name])

    return (
        <Dropdown title={title}
            selected={selectedIndex}
            width='x-large'
            onSelect={onSelected}>
            {languages.map((language) => {
                return { key: language.value, children: language.label }
            })}
        </Dropdown>
    )
}

SelectLanguage.propTypes = {
    title: PropTypes.string,
    profile: PropTypes.object.isRequired,
    languages: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired,
    })).isRequired,
    save: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired,
}

export default SelectLanguage
