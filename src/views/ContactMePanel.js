
import { useCallback, useEffect } from 'react'
import Button from '@enact/moonstone/Button'
import { Panel, Header } from '@enact/moonstone/Panels'
import { Row, Cell, Layout } from '@enact/ui/Layout'
import $L from '@enact/i18n/$L'
import Image from '@enact/moonstone/Image'
import Item from '@enact/moonstone/Item'
import ri from '@enact/ui/resolution'
import ExpandableItem from '@enact/moonstone/ExpandableItem'
import Spotlight from '@enact/spotlight'

import PropTypes from 'prop-types'
import { useSetRecoilState, useRecoilValue } from 'recoil'

import { pathState, contactBtnState } from '../recoilConfig'
import api from '../api'
import ethImg from '../../resources/img/eth.png'
import emailImg from '../../resources/img/email.png'
import coffeeImg from '../../resources/img/coffee.png'
import githubImg from '../../resources/img/github.png'
//import perfilImg from '../../resources/img/perfil.jpeg'


const ImageInfo = (props) => (
    <Layout orientation="vertical" align="center"
        style={{ height: '100%', width: '100%' }}>
        {props.title &&
            <Cell
                component={Item}
                {...props.title}
                align='center'
                shrink
            />
        }
        <Cell
            component={Image}
            {...props.image}
            align='center'
            style={{
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        />
    </Layout>
)


/**
 * @param {{noAcceptBtn: boolean}}
 */
const ContactMePanel = ({ noAcceptBtn, ...rest }) => {
    /** @type {Function} */
    const setPath = useSetRecoilState(pathState)
    /** @type {Boolean} */
    const contactBtn = useRecoilValue(contactBtnState)

    const accept = useCallback(async () => {
        await api.config.setNextContactDate()
        setPath('/login')
    }, [setPath])

    useEffect(() => {
        if (contactBtn && !noAcceptBtn) {
            const interval = setInterval(() => {
                if (document.querySelector('#accept')) {
                    Spotlight.focus('#accept')
                    clearInterval(interval)
                }
            })
            return () => clearInterval(interval)
        }
    }, [contactBtn, noAcceptBtn])


    return (
        <Panel {...rest}>
            <Header title={$L('Contact Information')} titleBelow={$L('About me')} >
                {contactBtn && !noAcceptBtn &&
                    <Button id="accept" onClick={accept}>{$L('Continue')}</Button>
                }
            </Header>
            <Row style={{ height: '50%' }} align="center">
                <Cell>
                    <ExpandableItem
                        style={{
                            textAlign: 'justify',
                            margin: '0 ' + ri.unit(12, 'rem'),
                        }}
                        title={$L('About me')}>
                        {$L(`Hi there! My name is Esteban and I'm a programmer by
 profession. I have been in the tech industry for couple of years now and I love
 what I do. In my free time, I enjoy watching anime and staying up to date with
 the latest shows.`)}
                    </ExpandableItem>
                </Cell>
                {/*
                <Cell style={{ height: '100%' }}>
                    <ImageInfo
                        image={{ src: perfilImg }}
                        title={{ children: $L('Avatar') }} />
                </Cell>
                */}
                <Cell >
                    <ExpandableItem
                        style={{
                            textAlign: 'justify',
                            margin: '0 ' + ri.unit(12, 'rem'),
                        }}
                        title={$L('Issues or suggestion?')}>
                        {$L(`If you have any issues, problems, or suggestion
 regarding our project, please feel free to leave them in our GitHub repository.
 Your feedback is always welcome and will help us improve our project.`)
                        }
                    </ExpandableItem>
                </Cell>
                <Cell style={{ height: '100%' }}>
                    <ImageInfo
                        image={{ src: githubImg }}
                        title={{ children: 'Github' }}
                    />
                </Cell>
            </Row>
            <Row style={{ height: '50%' }} align="center">
                <Cell >
                    <ExpandableItem
                        style={{
                            textAlign: 'justify',
                            margin: '0 ' + ri.unit(12, 'rem'),
                        }}
                        title={$L('Donation?')}>
                        {$L(`We appreciate your support for our project! If you
 would like to make a donation, we offer several options to choose from. Your
 contributions help us continue to develop. Thank you for your generosity!`)}
                    </ExpandableItem>
                </Cell>
                <Cell style={{ height: '100%' }}>
                    <ImageInfo
                        image={{ src: emailImg }}
                        title={{ children: $L('Email (Binance, WISE)') }}
                    />
                </Cell>
                <Cell style={{ height: '100%' }}>
                    <ImageInfo
                        image={{ src: coffeeImg }}
                        title={{ children: $L('Buy me a coffee') }}
                    />
                </Cell>
                <Cell style={{ height: '100%' }}>
                    <ImageInfo
                        image={{ src: ethImg }}
                        title={{ children: 'Ethereum' }}
                    />
                </Cell>
            </Row>
        </Panel>
    )
}

ContactMePanel.propTypes = {
    noAcceptBtn: PropTypes.bool,
}

export default ContactMePanel
