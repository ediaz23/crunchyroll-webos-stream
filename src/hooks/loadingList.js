
import { Column } from '@enact/ui/Layout'
import Spinner from '@enact/moonstone/Spinner'

import { $L } from '../hooks/language'

/**
 * @param {import('react').ComponentType<Any>} WrappedComponent
 * @param {String} [propName]
 */
const withLoadingList = (WrappedComponent, propName = 'list') => {

    return props => {
        const list = props[propName]
        return (<>
            {!list &&
                <Column align='center center' style={{ height: '100%', width: '100%' }}>
                    <Spinner />
                </Column>
            }
            {list && list.length === 0 &&
                <Column align='center center' style={{ height: '100%', width: '100%' }}>
                    <h1>{$L('Empty')}</h1>
                </Column>
            }
            {list && list.length > 0 &&
                <WrappedComponent {...props} />
            }
        </>)
    }
}

export default withLoadingList
