
import { useState, useCallback } from 'react'
import { Column, Cell, Row } from '@enact/ui/Layout'
import SelectableItem from '@enact/moonstone/SelectableItem'
import PropTypes from 'prop-types'
import $L from '@enact/i18n/$L'

import MusicFeed from './Feed'
import ContentGrid from '../grid/ContentGrid'


const MusicBrowse = ({ profile, musicfeed }) => {

    const [tab, setTab] = useState('feed')
    const changeTab = useCallback(({ value }) => {
        setTab(value)
    }, [])

    return (
        <Column style={{ paddingLeft: '0.5rem' }}>
            <Cell shrink>
                <Row style={{ width: '40%' }}>
                    <Cell>
                        <SelectableItem
                            selected={tab === 'feed'}
                            onToggle={changeTab}
                            value='feed'>
                            {$L('Feed')}
                        </SelectableItem>
                    </Cell>
                    <Cell>
                        <SelectableItem
                            selected={tab === 'search'}
                            onToggle={changeTab}
                            value='search'>
                            {$L('Search')}
                        </SelectableItem>
                    </Cell>
                </Row>
            </Cell>
            <Cell grow>
                {tab === 'feed' &&
                    <MusicFeed
                        profile={profile}
                        musicfeed={musicfeed} />
                }
                {tab === 'search' &&
                    <ContentGrid
                        profile={profile}
                        contentKey='music'
                        contentType='music'
                        engine='search'
                        noCategory />
                }
            </Cell>
        </Column>
    )
}

MusicBrowse.propTypes = {
    profile: PropTypes.object.isRequired,
    musicfeed: PropTypes.arrayOf(PropTypes.object).isRequired,
}

export default MusicBrowse
